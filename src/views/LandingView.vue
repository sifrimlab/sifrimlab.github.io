<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { siteContent } from '../generated/content';
import { citation, formatDate, withBase } from '../lib/util';
import { useDeck } from '../lib/useDeck';
import PairMark from '../components/PairMark.vue';
import InkField from '../components/InkField.vue';
import PublicationItem from '../components/PublicationItem.vue';
import type { CitationItem } from '../types/content';

const { home, research } = siteContent;

// The welcome paragraph: its closing sentence is the lab's mission and leads the page;
// the sentences before it frame the problem in the "approach" section.
const introText = home.introHtml.replace(/<\/?p>/g, '').trim();
const splitAt = introText.lastIndexOf('By leveraging');
const mission = splitAt > 0 ? introText.slice(splitAt) : introText;
const context = splitAt > 0 ? introText.slice(0, splitAt).trim() : '';

// The approach section is one monolithic paragraph. The text stays quiet and the key
// messages are lifted out of it typographically. Phrases that are not found in the text
// (e.g. after an edit to the content file) are simply skipped.
const keyPhrases = [
  'highly heterogeneous data sources',
  'detect patterns',
  'deeper insights',
  'are complex when dealing with heterogeneous and highly dimensional datasets',
];

interface Segment {
  text: string;
  key: boolean;
}

const approachSegments = computed<Segment[]>(() => {
  const hits = keyPhrases
    .map((phrase) => ({ phrase, at: context.indexOf(phrase) }))
    .filter((h) => h.at >= 0)
    .sort((x, y) => x.at - y.at);
  const out: Segment[] = [];
  let cursor = 0;
  for (const { phrase, at } of hits) {
    if (at < cursor) continue; // overlapping phrase
    if (at > cursor) out.push({ text: context.slice(cursor, at), key: false });
    out.push({ text: phrase, key: true });
    cursor = at + phrase.length;
  }
  if (cursor < context.length) out.push({ text: context.slice(cursor), key: false });
  return out;
});

// Research themes: an index of titles (left) drives a stage (right) that shows the active
// theme's biological question and the computational approach that answers it.
const activeTheme = ref(0);
const tabs = ref<HTMLElement[]>([]);

function onTabKeydown(event: KeyboardEvent): void {
  const last = research.length - 1;
  const moves: Record<string, number> = {
    ArrowDown: Math.min(activeTheme.value + 1, last),
    ArrowUp: Math.max(activeTheme.value - 1, 0),
    Home: 0,
    End: last,
  };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  activeTheme.value = next;
  void nextTick(() => tabs.value[next]?.focus());
}

// The landing page is a slide deck (see lib/useDeck.ts): one gesture = one slide, with a
// crossfade between slides. The Research slide has steps of its own: scrolling there walks
// through the themes one by one, and only after the first or last theme does the deck move on.
const landingEl = ref<HTMLElement | null>(null);
const researchEl = ref<HTMLElement | null>(null);
const deck = useDeck(landingEl);

onMounted(() => {
  if (!researchEl.value) return;
  deck.registerStepper(researchEl.value, {
    canStep: (dir) => activeTheme.value + dir >= 0 && activeTheme.value + dir < research.length,
    step: (dir) => {
      activeTheme.value += dir;
    },
    // coming from above starts at the first theme, coming back from below at the last
    enter: (dir) => {
      activeTheme.value = dir > 0 ? 0 : research.length - 1;
    },
  });
});

// the hero ink only runs while the hero is what is on screen
const inkPaused = computed(() => deck.active.value && deck.current.value !== 0 && !deck.animating.value);

const featured = computed(() =>
  home.featuredPublications.map((id) => citation(id)).filter((c): c is CitationItem => Boolean(c)).slice(0, 5),
);
const latestNews = siteContent.news.slice(0, 3);
</script>

<template>
  <div ref="landingEl" class="landing">
    <!-- Masthead -->
    <section class="hero" data-deck-label="Introduction">
      <InkField class="hero__ink" :paused="inkPaused" />
      <div class="wrap hero__grid">
        <div class="hero__text">
          <h1 class="hero__title">
            <span class="hero__lab">{{ home.title }}</span>
            <span class="hero__tagline">
              <span class="hero__line ink-comp">Artificial intelligence</span>
              <span class="hero__line"><span class="hero__for">for</span>{{ ' ' }}<span class="ink-bio">molecular biology</span></span>
            </span>
          </h1>
          <p class="lead hero__lede">{{ mission }}</p>
          <div class="hero__actions">
            <RouterLink to="/research" class="button">Explore our research</RouterLink>
            <RouterLink to="/team" class="button button--ghost">Meet the team</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Approach: a full-screen statement, the second "chapter" of the page -->
    <section v-if="context" class="approach" aria-labelledby="approach-title" data-deck-label="Our approach">
      <div class="wrap approach__inner">
        <h2 id="approach-title" class="approach__title" data-reveal>
          <span class="approach__our">Our</span>{{ ' ' }}<span class="approach__word">approach</span>
        </h2>

        <p class="approach__text" data-reveal>
          <template v-for="(seg, i) in approachSegments" :key="i"
            ><strong v-if="seg.key" class="approach__key">{{ seg.text }}</strong
            ><template v-else>{{ seg.text }}</template></template
          >
        </p>
      </div>
    </section>

    <!-- Research themes -->
    <section ref="researchEl" class="section research" data-deck-label="Research">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <p class="label">Research</p>
            <h2>Decoding the complexity of biological systems</h2>
          </div>
          <RouterLink to="/research" class="more">All research</RouterLink>
        </div>

        <div class="themes" data-reveal>
          <!-- index: the six themes (desktop; narrower screens show every theme in full) -->
          <ol class="themes__index" role="tablist" aria-orientation="vertical" aria-label="Research themes" @keydown="onTabKeydown">
            <li v-for="(t, i) in research" :key="t.slug">
              <button
                :id="`theme-tab-${t.slug}`"
                :ref="(el) => { if (el) tabs[i] = el as HTMLElement; }"
                type="button"
                role="tab"
                class="tab"
                :class="{ 'is-active': i === activeTheme }"
                :aria-selected="i === activeTheme"
                :aria-controls="`theme-panel-${t.slug}`"
                :tabindex="i === activeTheme ? 0 : -1"
                @mouseenter="activeTheme = i"
                @click="activeTheme = i"
                @focus="activeTheme = i"
              >
                <span class="tab__num">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="tab__title">{{ t.title }}</span>
                <span class="tab__arrow" aria-hidden="true">→</span>
              </button>
            </li>
          </ol>

          <!-- stage: panels share one grid cell, so the stage never changes height -->
          <div class="themes__stage">
            <article
              v-for="(t, i) in research"
              :id="`theme-panel-${t.slug}`"
              :key="t.slug"
              class="panel"
              :class="{ 'is-active': i === activeTheme }"
              role="tabpanel"
              :aria-labelledby="`theme-tab-${t.slug}`"
            >
              <h3 class="panel__title">
                <span class="panel__num">{{ String(i + 1).padStart(2, '0') }}</span>{{ t.title }}
              </h3>
              <div class="panel__thread">
                <div class="panel__step panel__step--bio">
                  <span class="label label--bio">Question</span>
                  <p class="panel__question">{{ t.question }}</p>
                </div>
                <div class="panel__step panel__step--comp">
                  <span class="label label--comp">Approach</span>
                  <p class="panel__approach">{{ t.approach }}</p>
                  <RouterLink :to="{ path: '/research', hash: `#${t.slug}` }" class="more panel__more">
                    About this theme
                  </RouterLink>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent work -->
    <section class="section section--paper-2 recent" data-deck-label="Recent work">
      <div class="wrap split">
        <div class="sticky-col">
          <p class="label">Recent work</p>
          <h2 class="recent__title">Preprints and papers led by the lab</h2>
          <RouterLink to="/publications" class="more">All publications</RouterLink>
        </div>
        <ul class="pubs" data-reveal>
          <PublicationItem v-for="p in featured" :key="p.id" :pub="p" :max-authors="8" />
        </ul>
      </div>
    </section>

    <!-- News -->
    <section class="section latest" data-deck-label="News">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <p class="label">News</p>
            <h2>From the lab</h2>
          </div>
          <RouterLink to="/news" class="more">All news</RouterLink>
        </div>
        <ul class="news">
          <li v-for="post in latestNews" :key="post.slug" class="news__item" data-reveal>
            <RouterLink :to="`/news/${post.slug}`" class="news__link">
              <span class="news__img">
                <img v-if="post.image" :src="withBase(post.image)" alt="" loading="lazy" />
                <PairMark v-else :size="48" />
              </span>
              <time class="meta" :datetime="post.date">{{ formatDate(post.date) }}</time>
              <h3 class="news__title">{{ post.title }}</h3>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- People -->
    <section class="section people" data-deck-label="People">
      <div class="wrap people__grid">
        <figure class="figure people__photo" data-reveal>
          <img
            :src="withBase('/images/team-1600.jpg')"
            alt="Members of the Laboratory of Multi-omic Integrative Bioinformatics"
            width="1400"
            height="1120"
            loading="lazy"
          />
        </figure>
        <div class="people__text">
          <p class="label">People</p>
          <h2>A team from many disciplines</h2>
          <p class="lead">{{ home.people }}</p>
          <div class="link-row">
            <RouterLink to="/team" class="more">Meet the team</RouterLink>
            <RouterLink to="/join" class="more">Join us</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Slide indicator: only shown while the page behaves as a deck -->
    <nav v-if="deck.active.value" class="deck-dots" aria-label="Slides">
      <button
        v-for="(label, i) in deck.labels.value"
        :key="label"
        type="button"
        class="deck-dots__dot"
        :class="{ 'is-current': i === deck.current.value }"
        :aria-label="label"
        :aria-current="i === deck.current.value ? 'true' : undefined"
        @click="deck.goTo(i)"
      >
        <span class="deck-dots__label" aria-hidden="true">{{ label }}</span>
      </button>
    </nav>
  </div>
</template>

<!-- The deck. Not scoped: the page scroller is <html> and the footer lives outside this view.
     Everything is gated on html.deck, which useDeck() sets only on screens large enough for
     full-page slides and for people who do not ask for reduced motion; elsewhere the page is
     an ordinary scrolling page. -->
<style>
html.deck {
  overflow: hidden;
  overscroll-behavior: none;
  --lift: 2.25rem; /* how far a slide drifts while it fades */
}

/* the stage: everything under the navigation bar */
html.deck .landing {
  position: fixed;
  inset: var(--deck-top, var(--nav-h)) 0 0 0;
  overflow: hidden;
}

/* every slide fills the stage; slides are stacked and only the current one is visible */
html.deck .landing > section {
  position: absolute;
  inset: 0;
  min-height: 0;
  margin: 0;
  overflow: hidden;
  border: 0;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

html.deck .landing > .section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  justify-content: safe center;
}

html.deck .landing > .hero,
html.deck .landing > .approach {
  align-items: center;
  align-items: safe center;
}

/* slides parked before / after the current one wait on the side they will enter from */
html.deck .landing > section[data-pos='before'] {
  transform: translateY(calc(var(--lift) * -1));
}

html.deck .landing > section[data-pos='after'] {
  transform: translateY(var(--lift));
}

html.deck .landing > section[data-pos='current'] {
  opacity: 1;
  visibility: visible;
  transform: none;
  pointer-events: auto;
}

/* crossfade with a slight lift: the slide that leaves drifts away from the direction of travel,
   the one that arrives comes from it. Visibility is released only after the fade-out. */
html.deck-ready .landing > section {
  transition:
    opacity 0.6s var(--ease),
    transform 0.7s var(--ease),
    visibility 0s linear 0.7s;
}

html.deck-ready .landing > section[data-pos='current'] {
  transition:
    opacity 0.6s var(--ease) 0.08s,
    transform 0.7s var(--ease) 0.08s,
    visibility 0s;
}

/* too tall for the screen: scaled down a little (set by useDeck) rather than clipped */
html.deck .landing > section > .wrap {
  zoom: var(--fit, 1);
}

/* content reveals when its slide arrives (not when it scrolls into view), in a small stagger */
html.deck .landing > section [data-reveal] {
  opacity: 0;
  transform: translateY(14px);
}

html.deck .landing > section[data-pos='current'] [data-reveal] {
  opacity: 1;
  transform: none;
}

html.deck-ready .landing > section[data-pos='current'] [data-reveal] {
  transition:
    opacity 0.7s var(--ease) 0.3s,
    transform 0.7s var(--ease) 0.3s;
}

html.deck-ready .landing > section:not([data-pos='current']) [data-reveal] {
  transition: opacity 0.3s var(--ease);
}

html.deck .landing > section [data-reveal]:nth-child(2) {
  transition-delay: 0.4s;
}

html.deck .landing > section [data-reveal]:nth-child(3) {
  transition-delay: 0.5s;
}

/* the footer closes the deck: it is part of the last slide, revealed together with it */
html.deck .foot {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 40;
  margin: 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(var(--lift));
}

html.deck.deck-last .foot {
  opacity: 1;
  visibility: visible;
  transform: none;
}

html.deck-ready .foot {
  transition:
    opacity 0.6s var(--ease),
    transform 0.7s var(--ease),
    visibility 0s linear 0.7s;
}

html.deck-ready.deck-last .foot {
  transition:
    opacity 0.6s var(--ease) 0.08s,
    transform 0.7s var(--ease) 0.08s,
    visibility 0s;
}

/* compact footer: the lists run in two columns and the affiliation line is dropped, so the
   footer stays a strip and the last slide keeps most of the screen */
html.deck .foot .foot__top {
  gap: var(--s-4) var(--s-6);
  padding-block: var(--s-5) var(--s-4);
}

@media (min-width: 1000px) {
  html.deck .foot .foot__top {
    grid-template-columns: 1fr auto auto minmax(0, 20rem);
  }
}

/* small screens: only the identity and the main links, so the last slide still has room */
@media (max-width: 999px), (max-height: 640px) {
  html.deck .foot .foot__top {
    grid-template-columns: 1fr auto;
    padding-block: var(--s-4) var(--s-3);
  }

  html.deck .foot .foot__col:nth-child(n + 3) {
    display: none;
  }
}

html.deck .foot .foot__col a {
  white-space: nowrap;
}

html.deck .foot .foot__aff {
  display: none;
}

html.deck .foot .foot__name {
  font-size: 1.2rem;
}

html.deck .foot .foot__col ul {
  grid-template-columns: repeat(2, auto);
  justify-content: start;
  gap: var(--s-1) var(--s-5);
}

html.deck .foot .foot__bottom {
  padding-block: var(--s-3);
}

/* the last slide leaves room for the footer */
html.deck .landing > .people {
  padding-bottom: calc(var(--pad) + var(--foot-h, 0px));
}

html.deck .landing .people__photo img {
  max-height: calc(100svh - var(--deck-top, var(--nav-h)) - 2 * var(--pad) - var(--foot-h, 0px));
}

/* slide indicator */
.deck-dots {
  position: absolute;
  top: 50%;
  right: clamp(0.6rem, 1.4vw, 1.5rem);
  z-index: 30;
  display: grid;
  gap: 0.15rem;
  transform: translateY(-50%);
  transition: top 0.7s var(--ease);
}

.deck-dots__dot {
  position: relative;
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.deck-dots__dot::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--rule-strong);
  transition:
    transform 0.4s var(--ease),
    background-color 0.4s var(--ease);
}

.deck-dots__dot:hover::before {
  background: var(--muted);
}

.deck-dots__dot.is-current::before {
  background: var(--bio);
  transform: scale(1.5);
}

.deck-dots__label {
  position: absolute;
  right: 100%;
  padding: 0.2rem 0.55rem;
  margin-right: 0.25rem;
  border-radius: var(--radius);
  background: var(--ink);
  color: var(--paper);
  font-size: var(--t-small);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translateX(4px);
  transition:
    opacity 0.25s var(--ease),
    transform 0.25s var(--ease);
}

.deck-dots__dot:hover .deck-dots__label,
.deck-dots__dot:focus-visible .deck-dots__label {
  opacity: 1;
  transform: none;
}

/* on the last slide the footer covers the bottom of the stage: centre the dots above it */
html.deck-last .deck-dots {
  top: calc(50% - var(--foot-h, 0px) / 2);
}

/* the dots only exist in deck mode, but make sure they never show on a scrolling page */
html:not(.deck) .deck-dots {
  display: none;
}
</style>

<style scoped>
/* ── Masthead ── */
.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center;
  /* Fill exactly the space below the sticky navigation bar, so the next section only
     appears on scroll. lvh = the large viewport (mobile address bar hidden), so a
     collapsing address bar never reveals a sliver of the next section. The hero still
     grows when the content needs more room (short or landscape screens). */
  min-height: calc(100vh - var(--nav-h) - 1px);
  min-height: calc(100lvh - var(--nav-h) - 1px);
  /* optical centring: slightly more space below than above */
  padding-top: clamp(2.5rem, 5vh, 4.5rem);
  padding-bottom: clamp(3.5rem, 11vh, 8rem);
  border-bottom: 1px solid var(--rule);
}

.hero__ink {
  z-index: -1;
}

.hero__text {
  max-width: 58rem;
}

@media (max-width: 959px) {
  /* phones & small tablets: ink in the open space above, text anchored low */
  .hero {
    align-items: flex-end;
    padding-top: clamp(11rem, 34vh, 18rem);
    padding-bottom: clamp(2.5rem, 8vh, 4.5rem);
  }
}

@media (max-width: 959px) and (max-height: 540px) and (orientation: landscape) {
  /* phones in landscape: little height, so no reserved ink area above the text */
  .hero {
    align-items: center;
    padding-top: var(--s-6);
    padding-bottom: var(--s-6);
  }
}

.hero__title {
  display: grid;
  gap: var(--s-4);
}

.hero__lab {
  font-family: var(--font-serif);
  font-size: clamp(1.25rem, 1.1rem + 0.6vw, 1.6rem);
  font-weight: 450;
  font-style: italic;
  letter-spacing: 0;
  color: var(--ink-2);
}

.hero__tagline {
  display: grid;
  /* scales with width and height: larger on big screens, restrained on short ones */
  font-size: clamp(2.5rem, min(1.3rem + 3.9vw, 0.5rem + 7.2vh), 5.6rem);
  font-weight: 380;
  line-height: 1.02;
  letter-spacing: -0.03em;
}

.hero__line {
  display: block;
}

.hero__for {
  font-style: italic;
  font-weight: 300;
  color: var(--muted);
}

.hero__lede {
  margin-top: var(--s-6);
  max-width: 54ch;
  font-size: clamp(1.15rem, min(1.07rem + 0.35vw, 0.75rem + 1.1vh), 1.4rem);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  margin-top: var(--s-6);
}

/* ── Approach ──
   A full-screen band of its own: a ground one step darker than the paper (a deeper beige in
   light mode, a deeper night in dark mode) sets it apart from the sections around it, and
   large serif type makes the framing statement the second chapter of the page rather than
   one of many subsections. All colours follow the theme tokens. */
.approach {
  --slab: #e6ddca;
  position: relative;
  display: flex;
  align-items: center;
  min-height: calc(100vh - var(--nav-h));
  min-height: calc(100svh - var(--nav-h));
  padding-block: clamp(4rem, 12vh, 8rem);
  background: var(--slab);
  border-bottom: 1px solid var(--rule);
  color: var(--ink);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .approach {
    --slab: #0f1520;
  }
}

:root[data-theme='dark'] .approach {
  --slab: #0f1520;
}

.approach__inner {
  display: grid;
  gap: clamp(2.5rem, 7vh, 4.5rem);
}

/* same voice as the landing headline: light italic connective, one word in ink colour */
.approach__title {
  font-size: clamp(3rem, min(1.4rem + 5.2vw, 0.4rem + 7.5vh), 6.6rem);
  font-weight: 380;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--ink);
}

.approach__our {
  font-style: italic;
  font-weight: 300;
  color: var(--muted);
}

.approach__word {
  color: var(--bio-text);
}

.approach__text {
  max-width: 34em;
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, min(0.8rem + 1.9vw, 0.4rem + 3.6vh), 2.6rem);
  font-weight: 340;
  line-height: 1.28;
  letter-spacing: -0.018em;
  /* the body of the paragraph recedes so that the key messages carry it */
  color: var(--muted);
}

.approach__key {
  font-weight: 440;
  color: var(--ink);
}

/* Compact heading so the whole Research slide fits one screen (the sizes follow the screen
   height as well as its width). */
.research {
  padding-block: clamp(1.25rem, 4vh, 3.5rem);
}

.research .sec-head {
  margin-bottom: clamp(1rem, 3.5vh, 2.5rem);
}

.research .sec-head h2 {
  max-width: none;
  font-size: clamp(1.6rem, min(1.1rem + 1.5vw, 0.4rem + 3.8vh), 2.5rem);
}

/* ── Research themes: index + stage ──
   Narrow screens (and no JavaScript) show every theme stacked, each a question-to-approach
   thread. From 900px up, the titles become an index and one theme at a time is shown on the
   stage; panels share a single grid cell so switching never moves the page. */
.themes {
  display: grid;
  gap: var(--s-8);
}

.themes__index {
  display: none;
  list-style: none;
}

.themes__stage {
  display: grid;
  gap: var(--s-8);
}

.panel__title {
  display: flex;
  gap: var(--s-4);
  align-items: baseline;
  margin-bottom: var(--s-5);
  font-size: var(--t-h3);
}

.panel__num {
  font-size: 1.05rem;
  font-weight: 400;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

/* the thread: an orange node (the question) joined to a blue node (the approach) */
.panel__thread {
  position: relative;
  display: grid;
  gap: var(--s-6);
  padding-left: 2.75rem;
}

.panel__thread::before {
  content: '';
  position: absolute;
  left: 0.42rem;
  top: 0.55rem;
  bottom: 0.55rem;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--bio), var(--comp));
  transform-origin: top;
}

.panel__step {
  position: relative;
  display: grid;
  gap: var(--s-3);
  align-content: start;
}

.panel__step::before {
  content: '';
  position: absolute;
  left: -2.75rem;
  top: 0.02rem;
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 50%;
  background: var(--bio);
  box-shadow: 0 0 0 5px var(--paper);
}

.panel__step--comp::before {
  background: var(--comp);
}

.panel__question {
  font-family: var(--font-serif);
  font-size: clamp(1.3rem, min(1.1rem + 1.1vw, 0.5rem + 2.7vh), 2.15rem);
  font-style: italic;
  font-weight: 340;
  line-height: 1.22;
  letter-spacing: -0.015em;
  color: var(--ink);
}

.panel__approach {
  max-width: 46ch;
  font-family: var(--font-serif);
  font-size: clamp(1.05rem, min(1.02rem + 0.35vw, 0.55rem + 1.5vh), 1.3rem);
  line-height: 1.45;
  color: var(--ink-2);
}

.panel__more {
  margin-top: var(--s-2);
  justify-self: start;
}

@media (min-width: 900px) {
  .js-reveal .themes {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: clamp(2rem, 5vw, var(--s-9));
    align-items: center;
  }

  .js-reveal .themes__index {
    display: block;
    border-top: 1px solid var(--rule-strong);
  }

  .js-reveal .themes__index li {
    border-bottom: 1px solid var(--rule);
  }

  .tab {
    display: grid;
    grid-template-columns: 2.25rem 1fr auto;
    align-items: baseline;
    width: 100%;
    padding: clamp(0.35rem, 1.5vh, 1rem) 0;
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
    color: var(--muted);
    transition: color 0.3s var(--ease);
  }

  .tab:hover,
  .tab.is-active {
    color: var(--ink);
  }

  .tab__num {
    font-family: var(--font-serif);
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
    transition: color 0.3s var(--ease);
  }

  .tab.is-active .tab__num {
    color: var(--bio-text);
  }

  .tab__title {
    font-family: var(--font-serif);
    font-size: clamp(1.05rem, min(0.95rem + 0.75vw, 0.5rem + 1.8vh), 1.6rem);
    font-weight: 400;
    line-height: 1.18;
    letter-spacing: -0.012em;
  }

  .tab__arrow {
    opacity: 0;
    transform: translateX(-8px);
    transition:
      opacity 0.3s var(--ease),
      transform 0.3s var(--ease);
  }

  .tab.is-active .tab__arrow {
    opacity: 1;
    transform: none;
    color: var(--comp-text);
  }

  .js-reveal .panel__title {
    display: none;
  }

  .js-reveal .themes__stage {
    gap: 0;
  }

  .js-reveal .panel {
    grid-area: 1 / 1;
    align-self: center;
    visibility: hidden;
    opacity: 0;
  }

  .js-reveal .panel.is-active {
    visibility: visible;
    opacity: 1;
  }

  .js-reveal .panel__thread {
    gap: clamp(2rem, 6vh, 3.5rem);
  }
}

@media (min-width: 900px) and (prefers-reduced-motion: no-preference) {
  /* the thread draws itself downward: the question first, then the approach that answers it */
  .js-reveal .panel {
    transition:
      opacity 0.35s var(--ease),
      visibility 0s linear 0.35s;
  }

  .js-reveal .panel.is-active {
    transition:
      opacity 0.35s var(--ease) 0.1s,
      visibility 0s;
  }

  .js-reveal .panel__thread::before {
    transform: scaleY(0);
  }

  .js-reveal .panel__step--comp {
    opacity: 0;
    transform: translateY(10px);
  }

  .js-reveal .panel.is-active .panel__thread::before {
    transform: none;
    transition: transform 0.7s var(--ease) 0.1s;
  }

  .js-reveal .panel.is-active .panel__step--comp {
    opacity: 1;
    transform: none;
    transition:
      opacity 0.5s var(--ease) 0.45s,
      transform 0.5s var(--ease) 0.45s;
  }
}

/* ── Recent work ──
   Compact so the whole slide fits one screen: the list is tightened with sizes that follow
   the screen height as well as its width (scoped overrides of the shared publication item). */
.recent {
  padding-block: clamp(1.25rem, 4vh, 3.5rem);
}

.recent .split {
  align-items: center;
}

@media (min-width: 900px) {
  /* a narrower heading column gives the list more width, so titles and authors wrap less */
  .recent .split {
    grid-template-columns: minmax(0, 3fr) minmax(0, 9fr);
    gap: clamp(2rem, 5vw, var(--s-8));
  }
}

.recent :deep(.pub) {
  padding-block: clamp(0.45rem, 1.5vh, 1.3rem);
}

@media (min-width: 900px) {
  /* venue and date move into a narrow column beside the title instead of a line above it */
  .recent :deep(.pub) {
    display: grid;
    grid-template-columns: 7.5rem minmax(0, 1fr);
    column-gap: var(--s-5);
    align-items: start;
  }

  .recent :deep(.pub__meta) {
    grid-row: 1 / span 2;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--s-1);
    padding-top: 0.3em;
    line-height: 1.35;
  }

  .recent :deep(.pub__meta > [aria-hidden='true']) {
    display: none;
  }

  .recent :deep(.pub__title),
  .recent :deep(.pub__authors) {
    grid-column: 2;
    margin-top: 0;
  }

  .recent :deep(.pub__authors) {
    margin-top: var(--s-1);
  }
}

.recent :deep(.pub__title) {
  margin-top: var(--s-1);
  font-size: clamp(1.02rem, min(0.95rem + 0.3vw, 0.5rem + 1.55vh), 1.22rem);
  line-height: 1.28;
}

.recent :deep(.pub__authors) {
  margin-top: var(--s-1);
  font-size: clamp(0.82rem, 0.4rem + 1.3vh, var(--t-small));
  line-height: 1.4;
}

@media (min-width: 900px) {
  .sticky-col {
    position: sticky;
    top: calc(var(--nav-h) + var(--s-6));
    align-self: start;
  }
}

.recent__title {
  margin-block: var(--s-3) var(--s-5);
}

@media (min-width: 900px) and (max-height: 640px) {
  .recent {
    padding-block: 1rem;
  }

  .recent :deep(.pub) {
    padding-block: 0.35rem;
  }
}

/* ── News ──
   Compact so the whole slide fits one screen: heading and picture heights follow the screen
   height as well as its width. */
.latest {
  padding-block: clamp(1.25rem, 4vh, 3.5rem);
}

.latest .sec-head {
  margin-bottom: clamp(1rem, 3.5vh, 2.5rem);
}

.latest .sec-head h2 {
  max-width: none;
  font-size: clamp(1.6rem, min(1.1rem + 1.5vw, 0.4rem + 3.8vh), 2.5rem);
}

@media (min-width: 900px) {
  /* the picture keeps its 3:2 shape until the screen is too short for it, then crops */
  .latest .news__img {
    max-height: clamp(8rem, 36vh, 20rem);
  }

  .latest .news__title {
    font-size: clamp(1.05rem, min(1rem + 0.35vw, 0.5rem + 1.7vh), 1.3rem);
  }
}

.news {
  list-style: none;
  display: grid;
  gap: var(--s-6);
}

@media (min-width: 760px) {
  .news {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.news__link {
  display: grid;
  gap: var(--s-3);
  text-decoration: none;
}

.news__img {
  display: grid;
  place-items: center;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border-radius: var(--radius);
  border: 1px solid var(--rule);
  background: #fff;
  margin-bottom: var(--s-2);
}

.news__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s var(--ease);
}

.news__link:hover .news__img img {
  transform: scale(1.03);
}

.news__title {
  font-size: 1.25rem;
  line-height: 1.3;
}

.news__link:hover .news__title {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-decoration-color: var(--bio);
  text-underline-offset: 0.15em;
}

/* ── People ──
   Compact so the whole slide fits one screen: the photo is capped to the height of the slide
   (it crops a little rather than pushing the slide taller) and the padding follows the
   screen height. */
.people {
  --pad: clamp(1.25rem, 4vh, 3.5rem);
  padding-block: var(--pad);
}

.people__grid {
  display: grid;
  gap: var(--s-7);
  align-items: center;
}

@media (min-width: 900px) {
  .people__grid {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    gap: var(--s-8);
  }
}

.people__photo img {
  width: 100%;
  border-radius: var(--radius);
}

@media (min-width: 900px) {
  .people__photo img {
    max-height: calc(100svh - var(--nav-h) - 2 * var(--pad) - 1px); /* 1px: the border above the section */
    object-fit: cover;
  }
}

.people__text h2 {
  margin-top: var(--s-3);
}

.people__text .lead {
  font-size: clamp(1.02rem, min(var(--t-lead), 0.3rem + 2vh), var(--t-lead));
  margin-block: clamp(0.75rem, 2.5vh, var(--s-5)) clamp(1rem, 3.5vh, var(--s-6));
}
</style>
