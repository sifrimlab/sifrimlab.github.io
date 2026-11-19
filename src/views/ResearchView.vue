<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { siteContent } from '../generated/content';
import { citation, member, withBase } from '../lib/util';
import type { CitationItem, ResearchResource, TeamMember } from '../types/content';
import PublicationItem from '../components/PublicationItem.vue';
import PersonChip from '../components/PersonChip.vue';
import PageHead from '../components/PageHead.vue';

const themes = siteContent.research.map((t) => ({
  ...t,
  resourceItems: t.resources
    .map((slug) => siteContent.resources.find((r) => r.slug === slug))
    .filter((r): r is ResearchResource => Boolean(r)),
  pubs: t.publications.map((id) => citation(id)).filter((c): c is CitationItem => Boolean(c)),
  members: t.people.map((slug) => member(slug)).filter((m): m is TeamMember => Boolean(m)),
}));

const LINK_LABELS: Record<string, string> = {
  paper: 'Paper',
  code: 'Code',
  docs: 'Documentation',
  browser: 'Data browser',
};

const active = ref(themes[0]?.slug ?? '');
let observer: IntersectionObserver | undefined;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) active.value = visible[0].target.id;
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  document.querySelectorAll('.rtheme').forEach((el) => observer!.observe(el));
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div>
    <PageHead title="Research">
      We develop machine learning and statistical methods to make sense of complex, multi-modal biological data. Our work
      spans tool development, disease modelling, and collaborative data analysis, always with a focus on reproducibility
      and biological interpretability.
    </PageHead>

    <div class="wrap research">
      <aside class="toc" aria-label="Research themes">
        <p class="label">Themes</p>
        <ol>
          <li v-for="(t, i) in themes" :key="t.slug">
            <a :href="`#${t.slug}`" :aria-current="active === t.slug ? 'true' : undefined">
              <span class="toc__num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span>{{ t.title }}</span>
            </a>
          </li>
        </ol>
        <RouterLink to="/publications" class="more toc__more">All publications</RouterLink>
      </aside>

      <div class="research__body">
        <section v-for="(t, i) in themes" :id="t.slug" :key="t.slug" class="rtheme" :aria-labelledby="`${t.slug}-title`">
          <p class="rtheme__num">{{ String(i + 1).padStart(2, '0') }}</p>
          <h2 :id="`${t.slug}-title`">{{ t.title }}</h2>

          <div class="prose rtheme__prose" v-html="t.bodyHtml"></div>

          <div v-if="t.resourceItems.length" class="rtheme__block">
            <h3 class="label">Methods &amp; resources</h3>
            <ul class="resources">
              <li v-for="r in t.resourceItems" :key="r.slug" class="resource">
                <figure v-if="r.image" class="figure resource__fig">
                  <div class="figure__frame" :class="`fit-${r.imageFit}`">
                    <img :src="withBase(r.image)" :alt="r.imageCaption ?? `${r.title}`" loading="lazy" />
                  </div>
                  <figcaption v-if="r.imageCaption">{{ r.imageCaption }}</figcaption>
                </figure>
                <div class="resource__body">
                  <p class="resource__kind">{{ r.kind }}</p>
                  <h4 class="resource__title">{{ r.title }}</h4>
                  <p class="resource__summary">{{ r.summary }}</p>
                  <p class="link-row resource__links">
                    <a v-for="(href, key) in r.links" :key="key" :href="href" class="more more--ext">
                      {{ LINK_LABELS[key] ?? key }}
                    </a>
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="t.pubs.length" class="rtheme__block">
            <h3 class="label">Key publications</h3>
            <ul class="pubs">
              <PublicationItem v-for="p in t.pubs" :key="p.id" :pub="p" heading-level="h4" :max-authors="10" />
            </ul>
          </div>

          <div v-if="t.members.length" class="rtheme__block">
            <h3 class="label">People</h3>
            <ul class="people">
              <li v-for="m in t.members" :key="m.slug"><PersonChip :person="m" /></li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.research {
  display: grid;
  gap: var(--s-6);
  padding-block: var(--s-7) var(--section);
}

@media (min-width: 1080px) {
  .research {
    grid-template-columns: 17rem minmax(0, 1fr);
    gap: var(--s-8);
  }
}

/* table of contents */
.toc ol {
  list-style: none;
  margin-top: var(--s-3);
  border-top: 1px solid var(--rule);
}

.toc li {
  border-bottom: 1px solid var(--rule);
}

.toc ol a {
  display: grid;
  grid-template-columns: 2rem 1fr;
  gap: var(--s-2);
  padding-block: var(--s-3);
  font-size: var(--t-small);
  line-height: 1.35;
  color: var(--ink-2);
  text-decoration: none;
  transition: color 0.2s var(--ease);
}

.toc__num {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.toc ol a:hover,
.toc ol a[aria-current='true'] {
  color: var(--ink);
}

.toc a[aria-current='true'] .toc__num {
  color: var(--bio-text);
}

.toc__more {
  margin-top: var(--s-5);
}

@media (min-width: 1080px) {
  .toc {
    position: sticky;
    top: calc(var(--nav-h) + var(--s-6));
    align-self: start;
  }
}

@media (max-width: 1079px) {
  .toc ol {
    columns: 2 16rem;
    column-gap: var(--s-6);
  }

  .toc li {
    break-inside: avoid;
  }

  .toc__more {
    display: none;
  }
}

/* themes */
.rtheme {
  padding-block: var(--s-8);
  border-top: 1px solid var(--rule-strong);
}

.rtheme:first-child {
  border-top: 0;
  padding-top: 0;
}

.rtheme__num {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.rtheme h2 {
  margin-top: var(--s-2);
  max-width: 24ch;
}

.rtheme__prose {
  margin-top: var(--s-6);
}

.rtheme__block {
  margin-top: var(--s-7);
}

.rtheme__block > .label {
  display: flex;
  margin-bottom: var(--s-4);
}

/* resources */
.resources {
  list-style: none;
  display: grid;
  gap: var(--s-6);
}

.resource {
  display: grid;
  gap: var(--s-4) var(--s-6);
  padding: var(--s-5);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}

@media (min-width: 760px) {
  .resource {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    align-items: start;
  }
}

.resource__fig .figure__frame {
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
}

.resource__fig .figure__frame img {
  width: 100%;
  height: 100%;
}

.fit-contain img {
  object-fit: contain;
  padding: var(--s-3);
}

.fit-cover img {
  object-fit: cover;
}

.resource__kind {
  font-size: var(--t-label);
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--comp-text);
}

.resource__title {
  margin-top: var(--s-2);
  font-size: 1.5rem;
}

.resource__summary {
  margin-top: var(--s-3);
  color: var(--ink-2);
  line-height: 1.55;
}

.resource__links {
  margin-top: var(--s-4);
}

/* people */
.people {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: var(--s-4) var(--s-5);
}
</style>
