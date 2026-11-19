/**
 * Prerenders every route of the site into static HTML (dist/<route>/index.html) so that
 * pages load fast, are indexable and readable without JavaScript. The client then hydrates.
 * Also writes redirect stubs for URLs of the previous (Jekyll) site.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { siteContent } from '../src/generated/content.ts';

const root = process.cwd();
const dist = path.join(root, 'dist');
const BASE = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/');

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function write(rel: string, html: string): void {
  const full = path.join(dist, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html, 'utf8');
}

function redirectStub(target: string): string {
  const url = `${BASE}${target.replace(/^\//, '')}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Redirecting…</title>
<link rel="canonical" href="${url}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${url}">
</head><body><p>This page has moved to <a href="${url}">${url}</a>.</p></body></html>\n`;
}

async function run(): Promise<void> {
  const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  if (!template.includes('<!--app-html-->')) throw new Error('dist/index.html is missing the <!--app-html--> placeholder');

  const routes: string[] = [
    '/',
    '/research',
    '/publications',
    '/team',
    '/news',
    '/join',
    '/privacy',
    '/terms',
    ...siteContent.team.map((m) => `/team/${m.slug}`),
    ...siteContent.news.map((p) => `/news/${p.slug}`),
  ];

  // Production SSR bundle (vite build --ssr): scoped-style ids match the client build exactly.
  const ssrEntry = path.join(root, 'dist-ssr', 'entry-server.js');
  const { render } = (await import(pathToFileURL(ssrEntry).href)) as typeof import('../src/entry-server');
  const page = async (url: string): Promise<string> => {
    const { html, head } = await render(url);
    return template
      .replace('<!--app-html-->', html)
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(head.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(head.description)}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(head.title)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(head.description)}$2`);
  };

  for (const url of routes) {
    write(url === '/' ? 'index.html' : path.join(url, 'index.html'), await page(url));
  }
  // 404.html is served for any unknown URL (including legacy URLs the router redirects),
  // so the client mounts fresh instead of hydrating the not-found markup.
  write('404.html', (await page('/this-page-does-not-exist')).replace('<div id="app">', '<div id="app" data-fresh>'));
  fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true });

  // Redirect stubs for the previous site's URLs.
  const stubs: Record<string, string> = {
    'projects/index.html': '/research/',
    'joinus/index.html': '/join/',
    'contact/index.html': '/join/',
  };
  for (const m of siteContent.team) stubs[`members/${m.slug}.html`] = `/team/${m.slug}/`;
  for (const p of siteContent.news) {
    const [y, mo, d] = p.date.split('-');
    const short = p.slug.slice(p.date.length + 1);
    stubs[`${y}/${mo}/${d}/${short}.html`] = `/news/${p.slug}/`;
  }
  for (const [file, target] of Object.entries(stubs)) write(file, redirectStub(target));

  fs.writeFileSync(path.join(dist, '.nojekyll'), '', 'utf8');
  console.log(`Prerendered ${routes.length} routes + 404, wrote ${Object.keys(stubs).length} redirect stubs.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
