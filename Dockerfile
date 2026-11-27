# syntax=docker/dockerfile:1
#
# Single-container deployment of the LMIB website, served over plain HTTP on port 9988.
#
#   docker build -t lmib-website .
#   docker run -d --name lmib-website --restart unless-stopped -p 9988:9988 \
#       -v lmib-cite-cache:/app/_cite/.cache lmib-website
#
# Then open http://<ip-address>:9988
#
# What runs inside:
#   * nginx serves the prerendered static site (built at image-build time, so it is up
#     immediately and identical to the version published online).
#   * A background scheduler re-runs the literature workflow (_cite/cite.py -> content:compile
#     -> build) every CITE_INTERVAL_HOURS (default 168 = weekly), like the update-citations
#     GitHub workflow. The new build replaces the live one only if every step succeeds;
#     otherwise the previous site and _data/citations.yaml are kept.
#
# Environment variables (all optional):
#   CITE_INTERVAL_HOURS  hours between literature updates; 0 disables the scheduler (default 168)
#   CITE_ON_START        1 = also run an update right after the container starts (default 0)
#   CITE_ALLOW_SHRINK    1 = let cite.py accept a result >20% smaller than the previous one
#
# Manual update:  docker exec lmib-website update-site

FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/opt/venv/bin:${PATH}" \
    CITE_INTERVAL_HOURS=168 \
    CITE_ON_START=0

# nginx (web server), python (citation workflow), tini (PID 1), git/ca-certificates (manubot, pip)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      nginx python3 python3-venv python3-pip tini ca-certificates git \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/venv

WORKDIR /app

# Python dependencies of the citation workflow (own layer: cached until requirements change)
COPY _cite/requirements.txt _cite/requirements.txt
RUN pip install --requirement _cite/requirements.txt

# Node dependencies (own layer: cached until package*.json change)
COPY package.json package-lock.json ./
RUN npm ci

# Site sources, citation workflow and content
COPY . .

# ── nginx: unprivileged, logs to stdout/stderr, behaves like GitHub Pages ────────────────
#   /team        -> 301 /team/   (relative redirect, so the host/port the client used is kept)
#   unknown URL  -> 404.html with a 404 status (the client router takes over from there)
COPY <<'EOF' /etc/nginx/nginx.conf
worker_processes auto;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;

events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /dev/stdout;

    client_body_temp_path /tmp/nginx/body;
    proxy_temp_path       /tmp/nginx/proxy;
    fastcgi_temp_path     /tmp/nginx/fastcgi;
    uwsgi_temp_path       /tmp/nginx/uwsgi;
    scgi_temp_path        /tmp/nginx/scgi;

    sendfile on;
    server_tokens off;
    absolute_redirect off;

    gzip on;
    gzip_vary on;
    gzip_min_length 512;
    gzip_types text/plain text/css text/xml application/javascript application/json
               application/xml image/svg+xml font/ttf font/otf;

    server {
        listen 9988 default_server;
        server_name _;

        root /srv/www;
        index index.html;
        error_page 404 /404.html;

        # Vite emits content-hashed file names under /assets/
        location /assets/ {
            try_files $uri =404;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        location / {
            try_files $uri $uri/ =404;
        }
    }
}
EOF

# ── update-site: literature workflow + rebuild, swapping the live site only on success ───
COPY <<'EOF' /usr/local/bin/update-site
#!/bin/bash
set -euo pipefail
cd /app

CITATIONS=_data/citations.yaml
cp "$CITATIONS" /tmp/citations.yaml.bak

restore() { echo "[update-site] FAILED - keeping the previous site and citations"; cp /tmp/citations.yaml.bak "$CITATIONS"; }
trap restore ERR

echo "[update-site] $(date -u +%FT%TZ) fetching literature (ORCID / Google Scholar / pinned ids)"
python _cite/cite.py

echo "[update-site] rebuilding the site"
npm run build

echo "[update-site] publishing the new build"
rm -rf /srv/www.new /srv/www.old
cp -a dist /srv/www.new
mv /srv/www /srv/www.old
mv /srv/www.new /srv/www
rm -rf /srv/www.old

trap - ERR
if cmp -s "$CITATIONS" /tmp/citations.yaml.bak; then
  echo "[update-site] done - citations unchanged"
else
  echo "[update-site] done - citations updated"
fi
EOF

# ── entrypoint: scheduler in the background, nginx in the foreground ─────────────────────
COPY <<'EOF' /usr/local/bin/entrypoint
#!/bin/bash
set -u

scheduler() {
  local hours="${CITE_INTERVAL_HOURS:-168}"
  [ "${CITE_ON_START:-0}" = "1" ] && { update-site || true; }
  if [ "$hours" -le 0 ] 2>/dev/null; then
    echo "[scheduler] disabled (CITE_INTERVAL_HOURS=$hours)"
    return
  fi
  echo "[scheduler] literature update every ${hours}h"
  while true; do
    sleep "$((hours * 3600))"
    update-site || true
  done
}

scheduler &
exec nginx -g 'daemon off;'
EOF

# Build the site now so the container serves immediately (uses the committed citations);
# then hand everything the runtime update needs over to the unprivileged user.
RUN chmod +x /usr/local/bin/update-site /usr/local/bin/entrypoint \
 && npm run build \
 && mkdir -p /srv /tmp/nginx /app/_cite/.cache \
 && cp -a dist /srv/www \
 && chown -R node:node /app /srv /tmp/nginx

USER node
EXPOSE 9988
VOLUME ["/app/_cite/.cache"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:9988/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["tini", "--", "entrypoint"]
