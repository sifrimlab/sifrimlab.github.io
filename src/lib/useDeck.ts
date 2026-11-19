/**
 * Slide-deck behaviour for a page made of full-screen sections.
 *
 * The page's top-level <section> children are the slides. While the deck is active exactly
 * one slide is visible; one gesture (wheel flick, trackpad swipe, key press, touch swipe or a
 * click on the slide dots) changes slide once, with a crossfade driven by CSS (see the deck
 * styles in LandingView.vue). The scroll position of the page is never used.
 *
 * The state lives in the DOM so that CSS can do all the visual work:
 *   html.deck          deck is on (page scroll is disabled, slides are stacked)
 *   html.deck-ready    transitions are enabled (not during the first layout)
 *   html.deck-last     the last slide is showing (the footer is revealed with it)
 *   section[data-pos]  "before" | "current" | "after": where the slide is parked
 *
 * The deck is only active on screens big enough for full-page slides and for people who do
 * not ask for reduced motion; everywhere else the page is an ordinary scrolling page and this
 * module does nothing. Client-only: everything happens in onMounted.
 */
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

export const DECK_QUERY = '(min-width: 900px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)';

/** time the crossfade takes; input is ignored for this long after a change */
const SLIDE_MS = 700;
/** a slide's inner step (e.g. next research theme) is quicker */
const STEP_MS = 420;
/** wheel silence that separates two gestures */
const GESTURE_GAP_MS = 140;
/** pixels of vertical swipe that count as a slide change */
const SWIPE_PX = 50;
/** the smallest a slide may be scaled down to fit the screen */
const MIN_FIT = 0.6;

type Dir = 1 | -1;

/** A slide that has its own steps (e.g. research themes) before the deck moves on. */
export interface Stepper {
  canStep(dir: Dir): boolean;
  step(dir: Dir): void;
  /** called when the deck brings this slide in, travelling in `dir` */
  enter(dir: Dir): void;
}

export function useDeck(root: Ref<HTMLElement | null>) {
  const active = ref(false);
  const current = ref(0);
  const count = ref(0);
  const labels = ref<string[]>([]);
  /** true while a slide change is animating */
  const animating = ref(false);

  const steppers = new Map<HTMLElement, Stepper>();
  const html = typeof document !== 'undefined' ? document.documentElement : undefined;

  let slides: HTMLElement[] = [];
  let lockUntil = 0;
  let animTimer: number | undefined;
  let resizeTimer: number | undefined;
  let query: MediaQueryList | undefined;
  let footerObserver: ResizeObserver | undefined;

  // wheel gesture tracking
  let lastWheelAt = 0;
  let lastWheelMag = 0;
  let lastWheelDir = 0;
  let consumed = false;
  let actionAt = 0;

  // touch
  let touchY: number | null = null;

  function registerStepper(el: HTMLElement, stepper: Stepper): void {
    steppers.set(el, stepper);
  }

  /* ── presentation ─────────────────────────────────────── */

  function render(): void {
    slides.forEach((slide, i) => {
      const pos = i < current.value ? 'before' : i > current.value ? 'after' : 'current';
      slide.dataset.pos = pos;
      if (pos === 'current') {
        slide.removeAttribute('inert');
        slide.removeAttribute('aria-hidden');
      } else {
        slide.setAttribute('inert', '');
        slide.setAttribute('aria-hidden', 'true');
      }
    });
    html?.classList.toggle('deck-last', current.value === slides.length - 1);
  }

  /** Slides sit flush under the navigation bar, whatever its exact height is. */
  function measureChrome(): void {
    if (!html) return;
    const nav = document.querySelector<HTMLElement>('.nav');
    if (nav) html.style.setProperty('--deck-top', `${Math.round(nav.getBoundingClientRect().height)}px`);
    const foot = document.querySelector<HTMLElement>('.foot');
    if (foot) html.style.setProperty('--foot-h', `${Math.round(foot.getBoundingClientRect().height)}px`);
  }

  /** Safety net: a slide taller than the screen is scaled down a little instead of clipped. */
  function fit(): void {
    for (const slide of slides) {
      slide.style.removeProperty('--fit');
      const avail = slide.clientHeight;
      const need = slide.scrollHeight;
      if (avail > 0 && need > avail + 1) {
        slide.style.setProperty('--fit', String(Math.max(MIN_FIT, avail / need).toFixed(3)));
      }
    }
  }

  function relayout(): void {
    measureChrome();
    fit();
  }

  /* ── navigation ───────────────────────────────────────── */

  function lock(ms: number): void {
    lockUntil = performance.now() + ms;
    actionAt = performance.now();
  }

  function goTo(target: number): void {
    if (!active.value) return;
    const next = Math.max(0, Math.min(slides.length - 1, target));
    if (next === current.value || performance.now() < lockUntil) return;
    const dir: Dir = next > current.value ? 1 : -1;
    steppers.get(slides[next]!)?.enter(dir);
    current.value = next;
    render();
    lock(SLIDE_MS);
    animating.value = true;
    window.clearTimeout(animTimer);
    animTimer = window.setTimeout(() => {
      animating.value = false;
    }, SLIDE_MS);
  }

  /** One step in `dir`: inside the current slide if it has steps left, otherwise to the next slide. */
  function move(dir: Dir): void {
    if (!active.value || performance.now() < lockUntil) return;
    const stepper = steppers.get(slides[current.value]!);
    if (stepper?.canStep(dir)) {
      stepper.step(dir);
      lock(STEP_MS);
      return;
    }
    goTo(current.value + dir);
  }

  /* ── input ────────────────────────────────────────────── */

  function onWheel(event: WheelEvent): void {
    if (!active.value || event.ctrlKey) return; // ctrl+wheel is the browser's zoom
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return; // horizontal: leave it alone
    event.preventDefault();

    const now = performance.now();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    const mag = Math.abs(event.deltaY) * unit;
    const dir = event.deltaY > 0 ? 1 : -1;
    const gap = now - lastWheelAt;

    // A trackpad keeps sending decaying events for a second after the fingers lift. A new
    // gesture is one that comes after a pause, reverses direction, speeds up again, or (a
    // mouse wheel turned continuously) is still strong long after the last change.
    const fresh =
      gap > GESTURE_GAP_MS ||
      dir !== lastWheelDir ||
      mag > lastWheelMag + 3 ||
      (now - actionAt > SLIDE_MS + 150 && mag >= 20);
    lastWheelAt = now;
    lastWheelMag = mag;
    lastWheelDir = dir;

    if (now < lockUntil) {
      // belongs to a gesture we are not going to act on
      consumed = true;
      return;
    }
    if (fresh) consumed = false;
    if (consumed || mag < 4) return;
    consumed = true;
    move(dir);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!active.value || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const onControl = Boolean(target?.closest('button, a'));

    let dir: Dir | 0 = 0;
    let to: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
      case 'PageDown':
        dir = 1;
        break;
      case 'ArrowUp':
      case 'PageUp':
        dir = -1;
        break;
      case ' ':
        if (onControl) return; // Space activates a focused button or link
        dir = event.shiftKey ? -1 : 1;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = slides.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (to !== null) goTo(to);
    else if (dir) move(dir);
  }

  function onTouchStart(event: TouchEvent): void {
    touchY = event.touches.length === 1 ? event.touches[0]!.clientY : null;
  }

  function onTouchMove(event: TouchEvent): void {
    if (active.value && touchY !== null) event.preventDefault(); // no rubber-banding of the page
  }

  function onTouchEnd(event: TouchEvent): void {
    if (!active.value || touchY === null) return;
    const dy = touchY - (event.changedTouches[0]?.clientY ?? touchY);
    touchY = null;
    if (Math.abs(dy) >= SWIPE_PX) move(dy > 0 ? 1 : -1);
  }

  function onResize(): void {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(relayout, 120);
  }

  /* ── on / off ─────────────────────────────────────────── */

  function enable(): void {
    const el = root.value;
    if (!el || !html || active.value) return;
    slides = Array.from(el.querySelectorAll<HTMLElement>(':scope > section'));
    if (slides.length < 2) return;
    count.value = slides.length;
    labels.value = slides.map((s, i) => s.dataset.deckLabel ?? `Slide ${i + 1}`);
    current.value = Math.min(current.value, slides.length - 1);

    html.classList.add('deck');
    window.scrollTo(0, 0);
    measureChrome();
    render();
    active.value = true;

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('resize', onResize);
    const foot = document.querySelector('.foot');
    if (foot && 'ResizeObserver' in window) {
      footerObserver = new ResizeObserver(() => onResize());
      footerObserver.observe(foot);
    }
    void document.fonts?.ready.then(() => active.value && relayout());

    // transitions are switched on only after the first layout, so the deck never animates in
    requestAnimationFrame(() => {
      relayout();
      requestAnimationFrame(() => html.classList.add('deck-ready'));
    });
  }

  function disable(): void {
    if (!html) return;
    active.value = false;
    animating.value = false;
    window.clearTimeout(animTimer);
    window.clearTimeout(resizeTimer);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', onResize);
    footerObserver?.disconnect();
    footerObserver = undefined;
    html.classList.remove('deck', 'deck-ready', 'deck-last');
    html.style.removeProperty('--deck-top');
    html.style.removeProperty('--foot-h');
    for (const slide of slides) {
      delete slide.dataset.pos;
      slide.removeAttribute('inert');
      slide.removeAttribute('aria-hidden');
      slide.style.removeProperty('--fit');
    }
    slides = [];
  }

  function sync(): void {
    if (query?.matches && html?.classList.contains('js-reveal')) enable();
    else disable();
  }

  onMounted(() => {
    query = window.matchMedia(DECK_QUERY);
    query.addEventListener('change', sync);
    sync();
  });

  onBeforeUnmount(() => {
    query?.removeEventListener('change', sync);
    disable();
  });

  return { active, current, count, labels, animating, goTo, move, registerStepper };
}
