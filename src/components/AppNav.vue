<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { withBase } from '../lib/util';

const route = useRoute();
const open = ref(false);

// Three theme modes: follow the system, light, dark. "system" is the absence of a data-theme
// attribute, so the stylesheet's prefers-color-scheme rules apply. The choice is deliberately
// not stored: a page load always starts on "system".
type Mode = 'system' | 'light' | 'dark';
const MODES: Mode[] = ['system', 'light', 'dark'];
const MODE_LABEL: Record<Mode, string> = { system: 'system', light: 'light', dark: 'dark' };
const mode = ref<Mode>('system');
const nextMode = computed(() => MODES[(MODES.indexOf(mode.value) + 1) % MODES.length]!);

const items = [
  { to: '/research', label: 'Research' },
  { to: '/publications', label: 'Publications' },
  { to: '/team', label: 'Team' },
  { to: '/news', label: 'News' },
  { to: '/join', label: 'Join us' },
];

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`);
}

watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);

const THEME_REVEAL_MS = 750;

function applyMode(next: Mode): void {
  mode.value = next;
  const root = document.documentElement;
  if (next === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', next);
}

const isDark = (m: Mode): boolean => m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

/**
 * Switch the theme. When the page really changes colour, the new theme grows out of the
 * button as an expanding circle and takes over the page (View Transitions API: the old page
 * stays underneath as a snapshot, the new one is revealed through a growing clip-path).
 * Without support for it, or for people who prefer reduced motion, the switch is immediate.
 */
function toggleTheme(event: MouseEvent): void {
  const next = nextMode.value;
  const doc = document as Document & { startViewTransition?: (cb: () => void | Promise<void>) => { ready: Promise<void>; finished: Promise<void> } };
  const animate =
    typeof doc.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    isDark(next) !== isDark(mode.value);
  if (!animate) {
    applyMode(next);
    return;
  }

  // origin of the circle: where the pointer clicked, or the button's centre for the keyboard
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = event.detail > 0 ? event.clientX : rect.left + rect.width / 2;
  const y = event.detail > 0 ? event.clientY : rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const root = document.documentElement;
  root.classList.add('theme-switching');
  const transition = doc.startViewTransition!(async () => {
    applyMode(next);
    await nextTick();
  });
  void transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: THEME_REVEAL_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => undefined);
  void transition.finished.finally(() => root.classList.remove('theme-switching'));
}
</script>

<template>
  <header class="nav" :class="{ 'is-open': open }">
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="wrap nav__bar">
      <RouterLink to="/" class="nav__brand" aria-label="LMIB, home">
        <span class="nav__logo"><img :src="withBase('/images/logo-lmib-notext.svg')" alt="" width="34" height="34" /></span>
        <span class="nav__name">LMIB</span>{{ ' ' }}<span class="nav__aff">KU Leuven</span>
      </RouterLink>

      <nav id="site-menu" class="nav__menu" aria-label="Main">
        <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="nav__link"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="nav__tools">
        <button
          type="button"
          class="nav__icon nav__theme"
          :data-mode="mode"
          :aria-label="`Colour theme: ${MODE_LABEL[mode]}. Switch to ${MODE_LABEL[nextMode]}`"
          :title="`Theme: ${MODE_LABEL[mode]} (click for ${MODE_LABEL[nextMode]})`"
          @click="toggleTheme"
        >
          <!-- a disc half in ink, half in paper: the contrast between themes. Split vertically for
               light and dark (mirrored), horizontally for "follow the system"; it turns when
               the mode changes. -->
          <svg class="nav__theme-glyph" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.7" />
            <path d="M12 3.4a8.6 8.6 0 0 1 0 17.2Z" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          class="nav__icon nav__toggle"
          :aria-expanded="open"
          aria-controls="site-menu"
          :aria-label="open ? 'Close menu' : 'Open menu'"
          @click="open = !open"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path v-if="!open" d="M4 8h16M4 16h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path v-else d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav {
  /* big screens: the navigation bar grows far less than the page */
  zoom: var(--chrome-zoom, 1);
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: saturate(1.2) blur(10px);
  -webkit-backdrop-filter: saturate(1.2) blur(10px);
  border-bottom: 1px solid var(--rule);
}

.nav__bar {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  min-height: 4.25rem;
}

.nav__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  margin-right: auto;
}

.nav__logo {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
}

.nav__logo img {
  width: 34px;
  height: 34px;
}

.nav__name {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.06em;
}

.nav__aff {
  padding-left: 0.6rem;
  border-left: 1px solid var(--rule-strong);
  font-size: var(--t-small);
  color: var(--muted);
}

.nav__menu {
  display: flex;
  align-items: center;
  gap: var(--s-1);
}

.nav__link {
  position: relative;
  padding: 0.55rem 0.75rem;
  font-size: var(--t-small);
  font-weight: 500;
  text-decoration: none;
  color: var(--ink-2);
  border-radius: var(--radius);
  transition: color 0.2s var(--ease);
}

.nav__link::after {
  content: '';
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.25rem;
  height: 2px;
  background: var(--ink);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s var(--ease);
}

.nav__link:hover {
  color: var(--ink);
}

.nav__link:hover::after,
.nav__link[aria-current='page']::after {
  transform: scaleX(1);
}

.nav__link[aria-current='page'] {
  color: var(--ink);
}

.nav__tools {
  display: flex;
  align-items: center;
  gap: var(--s-1);
}

.nav__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
}

.nav__icon:hover {
  background: var(--paper-2);
  color: var(--ink);
}

/* theme switch: the icon alone, no ring */
.nav__theme {
  width: 2.5rem;
  height: 2.5rem;
  margin-left: var(--s-2);
  color: var(--ink);
}

.nav__theme:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.nav__theme-glyph {
  /* rem, not px: the navigation bar is brought down by --chrome-zoom on big screens (see
     index.html), and a px size would shrink with it */
  width: 1.5rem;
  height: 1.5rem;
  transition: transform 0.55s var(--ease);
}

.nav__theme[data-mode='dark'] .nav__theme-glyph {
  transform: rotate(180deg);
}

.nav__theme[data-mode='system'] .nav__theme-glyph {
  transform: rotate(90deg);
}

@media (prefers-reduced-motion: reduce) {
  .nav__theme-glyph {
    transition: none;
  }
}

.nav__toggle {
  display: none;
}

/* the logo has near-black nodes: give it a paper disc on dark grounds */
:global(:root[data-theme='dark']) .nav__logo {
  background: #f6f2ea;
}

@media (prefers-color-scheme: dark) {
  :global(:root:not([data-theme='light'])) .nav__logo {
    background: #f6f2ea;
  }
}

@media (max-width: 860px) {
  .nav__aff {
    display: none;
  }

  .nav__toggle {
    display: grid;
  }

  .nav__menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: var(--s-2) var(--gutter) var(--s-5);
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
    display: none;
  }

  .is-open .nav__menu {
    display: flex;
  }

  .nav__link {
    padding: 0.85rem 0;
    font-family: var(--font-serif);
    font-size: 1.35rem;
    border-bottom: 1px solid var(--rule);
  }

  .nav__link::after {
    display: none;
  }

  .nav__link[aria-current='page'] {
    color: var(--bio-text);
  }
}
</style>
