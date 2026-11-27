<script setup lang="ts">
/**
 * Abstract hero background: two ink streams falling into one point of attraction.
 *
 * One stream of biology-orange ink and one of computation-blue ink enter from opposite
 * sides and gravitate around a shared centre: they fall in on tightening spirals, speed
 * up gently as they approach and mix progressively, until they touch an invisible disc
 * at the centre and are absorbed, which ends their life cycle. New ink keeps
 * arriving, so the flow is continuous (an abstract image of integrating two modalities:
 * biology and AI).
 *
 * Each particle leaves a trail (its recent positions, redrawn every frame on a
 * transparent canvas), so trails read like opaque, uniform brush strokes printed on the page. A CSS mask keeps the
 * ink away from the text and dissolves it softly at every edge.
 *
 * The field starts already in its steady state: before the first frame every particle is
 * placed at a random point of its journey (see prewarm()), so the streams and the orbiting
 * ink around the centre are there from the very first paint instead of building up over
 * the first minute. Resizing rescales the ink in place and a theme change only recolours
 * it, so the motion is never restarted.
 *
 * Decorative only (aria-hidden). Pauses off-screen and in background tabs; draws a
 * single still frame for users who prefer reduced motion; follows the light/dark theme.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

type RGB = [number, number, number];

interface Particle {
  x: number;
  y: number;
  /** dye: 0 = biology ink, 1 = computation ink */
  d0: number;
  age: number;
  life: number;
  /** ring buffer of recent positions (the visible trail) */
  hx: Float32Array;
  hy: Float32Array;
  head: number;
  count: number;
  /** waiting in the pool (not yet released into a stream) */
  idle: boolean;
  /** when dying, the trail retracts from its tail instead of vanishing at once */
  dying: boolean;
  /** how mixed this particle's ink is: 0 = pure source ink … 0.5 = fully mixed */
  blend: number;
  /** per-particle variation of attraction strength and spiral tightness */
  kf: number;
  pf: number;
}

/** trail length in samples, and samples per second */
const TRAIL = 72;
const SAMPLE_HZ = 30;
/** mean seconds from release to absorption (measured for these dynamics: ~26–80 s) */
const MEAN_LIFE_S = 48;
/** upper bound (s) of the age a pre-warmed particle can start with: longer than any life */
const WARM_MAX_S = 90;

const props = defineProps<{
  /** the field is hidden by its parent (e.g. another slide is showing): stop animating */
  paused?: boolean;
}>();

const root = ref<HTMLDivElement>();
const canvas = ref<HTMLCanvasElement>();
let cleanup: (() => void) | undefined;
onBeforeUnmount(() => cleanup?.());

/* ── helpers ─────────────────────────────────────────────── */

function parseColor(value: string, fallback: RGB): RGB {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = v.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return fallback;
}

const rgba = (c: RGB, a: number): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a.toFixed(3)})`;
const mix = (p: RGB, q: RGB, t: number): RGB => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];

/** Smooth 3D value noise in [0, 1] (quintic interpolation of hashed lattice values). */
function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const w = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
  const l = (a: number, b: number, t: number): number => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number): number => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

function potential(x: number, y: number, z: number): number {
  return noise3(x, y, z);
}

/** Divergence-free flow: the curl of a scalar noise potential. */
function curl(x: number, y: number, z: number): [number, number] {
  const e = 0.01;
  const dy = (potential(x, y + e, z) - potential(x, y - e, z)) / (2 * e);
  const dx = (potential(x + e, y, z) - potential(x - e, y, z)) / (2 * e);
  return [dy, -dx];
}

const BUCKETS = 9;
/** a newly released stroke fades in over this many seconds while its trail grows from nothing */
const FADE_IN_S = 3;
/** opacity steps used for the fade-in (strokes are batched by colour and opacity) */
const FADE_LEVELS = 8;

onMounted(() => {
  const el = root.value;
  const cv = canvas.value;
  if (!el || !cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const rand = Math.random;

  let W = 0;
  let H = 0;
  let time = 0;
  let raf = 0;
  let last = 0;
  let visible = true;
  let particles: Particle[] = [];
  let emitClock = 0;
  let nextSource = 0;
  let sampleClock = 0;

  // geometry & dynamics (CSS px), recomputed by measure()
  let m = 1;
  let cx = 0;
  let cy = 0;
  let spread = 0;
  let sources: Array<{ x: number; y: number }> = [];
  const ELL = 0.86; // flattening (wider than tall)
  let K = 0; // strength of the attraction
  let soft = 0; // softening: keeps the speed-up gentle (≈1.8× from streams to disc)
  let far = 0; // radius where the incoming streams start
  let disc = 0; // radius of the (invisible) absorbing disc at the centre
  let mixRadius = 0; // inks start mixing inside this radius; fully mixed at the disc

  let bucketColors: string[][] = [];

  /** The ink uses exactly the two accent tokens (--bio, --comp); mixed ink is their blend. */
  function readPalette(): void {
    const st = getComputedStyle(document.documentElement);
    const bio = parseColor(st.getPropertyValue('--bio'), [196, 87, 42]);
    const comp = parseColor(st.getPropertyValue('--comp'), [35, 71, 122]);
    bucketColors = Array.from({ length: FADE_LEVELS + 1 }, (_, l) =>
      Array.from({ length: BUCKETS }, (_, k) => rgba(mix(bio, comp, k / (BUCKETS - 1)), l / FADE_LEVELS)),
    );
  }

  /** Measure the element and derive geometry. Returns false if it has no size yet. */
  function measure(): boolean {
    const w = el!.clientWidth;
    const h = el!.clientHeight;
    if (!w || !h) return false;
    W = w;
    H = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv!.width = Math.round(W * dpr);
    cv!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const narrow = W < 960;
    m = Math.min(W, H);
    // keep in sync with the CSS mask below
    cx = W * (narrow ? 0.6 : 0.77);
    cy = H * (narrow ? 0.19 : 0.5);
    spread = m * 0.18; // wide incoming streams (bands of ink)
    const reach = m * (narrow ? 0.5 : 0.47);
    sources = [
      { x: cx - reach, y: cy + reach * 0.34 }, // biology ink enters from one side
      { x: cx + reach, y: cy - reach * 0.34 }, // AI ink from the opposite side
    ];
    K = 0.021 * Math.pow(m, 1.5);
    soft = m * 0.1;
    far = m * 0.45;
    disc = m * 0.07;
    mixRadius = m * 0.38;
    return true;
  }

  /** Speed and inward/orbital ratio at flattened radius r for particle p. */
  function kinematics(p: Particle, r: number): { speed: number; inward: number } {
    const speed = (p.kf * K) / Math.sqrt(r + soft);
    const t = Math.min(1, r / far);
    const pitch = 0.07 + 0.43 * t * t * (3 - 2 * t); // low → many wide orbits
    return { speed, inward: speed * pitch * p.pf };
  }

  function makePool(): void {
    const count = Math.round(Math.min(560, Math.max(280, (W * H) / 1600)));
    particles = Array.from({ length: count }, (_, i) => ({
      x: 0,
      y: 0,
      d0: i % 2,
      age: 0,
      life: 150, // safety net only: particles normally end by touching the disc
      hx: new Float32Array(TRAIL),
      hy: new Float32Array(TRAIL),
      head: 0,
      count: 0,
      idle: true,
      dying: false,
      blend: 0,
      kf: 1,
      pf: 1,
    }));
  }

  /**
   * Release a particle into its stream. Its trail is pre-filled by integrating the flow
   * backwards in time, so it enters with a full-length tail, as if it had always been
   * travelling towards the vortex.
   */
  function release(p: Particle): void {
    p.d0 = nextSource;
    nextSource = 1 - nextSource;
    const src = sources[p.d0]!;
    const rr = spread * Math.sqrt(rand());
    const a = rand() * Math.PI * 2;
    p.x = src.x + Math.cos(a) * rr;
    p.y = src.y + Math.sin(a) * rr * 0.8;
    p.kf = 0.8 + rand() * 0.4;
    p.pf = 0.65 + rand() * 0.7;
    p.age = 0;
    p.blend = 0;
    p.idle = false;
    p.dying = false;

    const dt = 1 / SAMPLE_HZ;
    let theta = Math.atan2((p.y - cy) / ELL, p.x - cx);
    let r = Math.hypot(p.x - cx, (p.y - cy) / ELL);
    for (let k = TRAIL - 1; k >= 0; k -= 1) {
      p.hx[k] = cx + Math.cos(theta) * r;
      p.hy[k] = cy + Math.sin(theta) * r * ELL;
      const { speed, inward } = kinematics(p, r);
      theta -= (speed / r) * dt;
      r += inward * dt;
    }
    p.head = 0;
    p.count = TRAIL;
  }

  /**
   * Advance the simulation by dt seconds.
   * Kinematic "gravity" around the centre, in a slightly flattened frame:
   *  - speed grows gently towards the centre (1/√(r + soft));
   *  - the ratio of inward to orbital speed shrinks with r: far away the fall is fairly
   *    direct (the incoming streams stay visible), closer in the ink orbits widely;
   *  - a little curl-noise turbulence, damped near the centre, keeps the ink organic;
   *  - touching the central disc ends the particle's life.
   * New particles are released at a constant rate, so the flow stays even.
   */
  function step(dt: number): void {
    time += dt;
    const turbulence = m * 0.012;
    const scale = 1 / (m * 0.35);
    const z = time * 0.04;

    emitClock += dt * (particles.length / MEAN_LIFE_S);
    while (emitClock >= 1) {
      emitClock -= 1;
      const p = particles.find((q) => q.idle);
      if (!p) {
        emitClock = 0;
        break;
      }
      release(p);
      // Seamless entry: the stroke starts as a point at its source and its trail then grows
      // sample by sample (together with a fade-in, see draw()), instead of a full-length
      // line appearing at once. Pre-warming keeps the full trail (see prewarm()).
      p.count = 1;
    }

    sampleClock += dt;
    const sample = sampleClock >= 1 / SAMPLE_HZ;
    if (sample) sampleClock -= 1 / SAMPLE_HZ;

    for (const p of particles) {
      if (p.idle) continue;
      if (p.dying) {
        // the tail runs into the disc after the absorbed particle
        if (sample) p.count -= 4;
        if (p.count <= 0) p.idle = true;
        continue;
      }
      // Integrate in polar coordinates (exact rotation + radial fall), so the spiral
      // never drifts outward numerically and every particle does reach the disc.
      const ex = p.x - cx;
      const ey = (p.y - cy) / ELL;
      const r = Math.hypot(ex, ey) + 1e-3;
      const { speed, inward } = kinematics(p, r);
      const theta = Math.atan2(ey, ex) + (speed / r) * dt;
      const r2 = Math.max(0, r - inward * dt);
      const damp = Math.min(1, r / (m * 0.15));
      const [nx, ny] = curl(p.x * scale, p.y * scale, z);
      p.x = cx + Math.cos(theta) * r2 + nx * turbulence * damp * dt;
      p.y = cy + Math.sin(theta) * r2 * ELL + ny * turbulence * damp * dt;
      const closeness = Math.max(0, Math.min(1, (mixRadius - r) / (mixRadius - disc)));
      p.blend = 0.5 * Math.pow(closeness, 1.6);
      if (r2 <= disc) {
        // touched the disc: end the trail exactly on its edge and absorb the particle
        p.x = cx + Math.cos(theta) * disc;
        p.y = cy + Math.sin(theta) * disc * ELL;
        p.hx[p.head] = p.x;
        p.hy[p.head] = p.y;
        p.head = (p.head + 1) % TRAIL;
        p.dying = true;
        continue;
      }
      p.age += dt;
      if (sample) {
        // fixed-length tail: the ring buffer is always full, oldest sample drops off
        p.hx[p.head] = p.x;
        p.hy[p.head] = p.y;
        p.head = (p.head + 1) % TRAIL;
        if (p.count < TRAIL) p.count += 1;
      }
      if (p.age > p.life || p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) {
        p.dying = true;
      }
    }
  }

  function draw(): void {
    if (!W) return;
    ctx!.clearRect(0, 0, W, H);
    const paths: Path2D[][] = Array.from({ length: FADE_LEVELS + 1 }, () =>
      Array.from({ length: BUCKETS }, () => new Path2D()),
    );
    // Cap each trail's drawn length: fast particles near the centre show as short streaks
    // instead of wrapping round and piling up into a dense blot.
    const maxLen = Math.min(W, H) * 0.3;
    const idx: number[] = [];
    for (const p of particles) {
      if (p.idle || p.count < 2) continue;
      // fade-in over the first seconds of life (smoothstep), quantised to FADE_LEVELS steps
      const f = Math.min(1, p.age / FADE_IN_S);
      const level = Math.round(f * f * (3 - 2 * f) * FADE_LEVELS);
      if (level === 0) continue;
      // pure ink in its stream; the inks mix progressively as they near the centre
      const d = p.d0 + (p.d0 < 0.5 ? 1 : -1) * p.blend;
      const b = Math.round(d * (BUCKETS - 1));
      // walk back from the newest sample until the length budget is used up
      idx.length = 0;
      let len = 0;
      let px = p.dying ? NaN : p.x;
      let py = p.dying ? NaN : p.y;
      for (let k = 0; k < p.count; k += 1) {
        const i = (p.head - 1 - k + TRAIL) % TRAIL;
        const x = p.hx[i]!;
        const y = p.hy[i]!;
        if (!Number.isNaN(px)) {
          len += Math.hypot(x - px, y - py);
          if (len > maxLen) break;
        }
        idx.push(i);
        px = x;
        py = y;
      }
      const n = idx.length;
      if (n < 2) continue;
      // oldest → newest, one continuous stroke of constant width and colour
      const path = paths[level]![b]!;
      for (let k = 0; k < n; k += 1) {
        const i = idx[n - 1 - k]!;
        if (k === 0) path.moveTo(p.hx[i]!, p.hy[i]!);
        else path.lineTo(p.hx[i]!, p.hy[i]!);
      }
      if (!p.dying) path.lineTo(p.x, p.y);
    }
    // uniform brush stroke; the width scales a little with the hero
    ctx!.lineWidth = Math.max(2.2, Math.min(W, H) * 0.004);
    ctx!.lineCap = 'round';
    ctx!.lineJoin = 'round';
    for (let l = 1; l <= FADE_LEVELS; l += 1) {
      for (let i = 0; i < BUCKETS; i += 1) {
        ctx!.strokeStyle = bucketColors[l]![i]!;
        ctx!.stroke(paths[l]![i]!);
      }
    }
  }

  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start(): void {
    if (raf || reduced.matches || !visible || document.hidden || props.paused) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /**
   * Advance one particle along its (noise-free) path for `seconds`, sampling its trail at the
   * same rate as the live simulation. Returns false if it touched the disc on the way.
   * Same polar integration as step(), without the turbulence: this is only used to place
   * particles at plausible positions at start-up, so it can be cheap.
   */
  function advance(p: Particle, seconds: number): boolean {
    const dt = 1 / SAMPLE_HZ;
    for (let t = 0; t < seconds; t += dt) {
      const ex = p.x - cx;
      const ey = (p.y - cy) / ELL;
      const r = Math.hypot(ex, ey) + 1e-3;
      const { speed, inward } = kinematics(p, r);
      const theta = Math.atan2(ey, ex) + (speed / r) * dt;
      const r2 = Math.max(0, r - inward * dt);
      if (r2 <= disc) return false;
      p.x = cx + Math.cos(theta) * r2;
      p.y = cy + Math.sin(theta) * r2 * ELL;
      const closeness = Math.max(0, Math.min(1, (mixRadius - r) / (mixRadius - disc)));
      p.blend = 0.5 * Math.pow(closeness, 1.6);
      p.age += dt;
      p.hx[p.head] = p.x;
      p.hy[p.head] = p.y;
      p.head = (p.head + 1) % TRAIL;
    }
    return true;
  }

  /**
   * Start in the steady state. Ink is released at a constant rate and every particle lives
   * until it touches the disc, so at any moment the ages of the particles in flight are
   * spread uniformly over their lives. Each particle is therefore released and advanced by
   * a random time; if it would have been absorbed by then it is drawn again (rejection
   * sampling), which reproduces that distribution exactly. The result: streams entering
   * from both sides and ink already orbiting the centre, from the first frame.
   */
  function prewarm(): void {
    makePool();
    for (const p of particles) {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        release(p);
        if (advance(p, rand() * WARM_MAX_S)) break;
        p.idle = true; // absorbed before its drawn age: try again
      }
    }
    emitClock = rand();
    time = 0;
  }

  /** Reduced motion: the same warmed-up field, drawn once and left still. */
  function stillFrame(): void {
    prewarm();
    draw();
  }

  /** Fade the canvas in on the first frame, so the field never pops into view. */
  function reveal(): void {
    cv!.classList.add('is-ready');
  }

  // Start fully developed (see prewarm()).
  readPalette();
  if (measure()) {
    if (reduced.matches) stillFrame();
    else {
      prewarm();
      draw();
      start();
    }
    reveal();
  }

  /** On resize, keep the ink and rescale it to the new geometry (no restart). */
  function onResize(): void {
    const oldCx = cx;
    const oldCy = cy;
    const oldM = m;
    const hadSize = W > 0;
    if (!measure()) return;
    if (!hadSize || !particles.length) {
      prewarm();
      reveal();
    } else {
      const k = m / oldM;
      const mapX = (x: number): number => cx + (x - oldCx) * k;
      const mapY = (y: number): number => cy + (y - oldCy) * k;
      for (const p of particles) {
        p.x = mapX(p.x);
        p.y = mapY(p.y);
        for (let i = 0; i < TRAIL; i += 1) {
          p.hx[i] = mapX(p.hx[i]!);
          p.hy[i] = mapY(p.hy[i]!);
        }
      }
    }
    draw();
  }

  let resizeTimer = 0;
  let lastSize = `${W}x${H}`;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const size = `${el.clientWidth}x${el.clientHeight}`;
      if (size !== lastSize) {
        lastSize = size;
        onResize();
      }
    }, 100);
  });
  ro.observe(el);

  const io = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) start();
    else stop();
  });
  io.observe(el);

  const stopWatch = watch(
    () => props.paused,
    (paused) => (paused ? stop() : start()),
  );

  const onVisibility = (): void => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  // Theme change: recolour only; the ink keeps flowing.
  const onTheme = (): void => {
    readPalette();
    if (!raf) draw();
  };
  const mo = new MutationObserver(onTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  scheme.addEventListener('change', onTheme);

  const onMotion = (): void => {
    if (reduced.matches) {
      stop();
      stillFrame();
    } else {
      start();
    }
  };
  reduced.addEventListener('change', onMotion);

  cleanup = () => {
    stop();
    stopWatch();
    window.clearTimeout(resizeTimer);
    ro.disconnect();
    io.disconnect();
    mo.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    scheme.removeEventListener('change', onTheme);
    reduced.removeEventListener('change', onMotion);
  };
});
</script>

<template>
  <div ref="root" class="ink" aria-hidden="true">
    <canvas ref="canvas" class="ink__canvas"></canvas>
  </div>
</template>

<style scoped>
.ink {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* keep in sync with the cloud geometry in layout() */
  -webkit-mask-image: radial-gradient(ellipse 42% 80% at 78% 50%, #000 28%, transparent 100%);
  mask-image: radial-gradient(ellipse 42% 80% at 78% 50%, #000 28%, transparent 100%);
}

.ink__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}

.ink__canvas.is-ready {
  opacity: 1;
  transition: opacity 0.6s var(--ease);
}

@media (max-width: 959px) {
  .ink {
    -webkit-mask-image: radial-gradient(ellipse 70% 30% at 60% 19%, #000 35%, transparent 100%);
    mask-image: radial-gradient(ellipse 70% 30% at 60% 19%, #000 35%, transparent 100%);
  }
}
</style>
