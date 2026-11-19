<script setup lang="ts">
import { computed, ref } from 'vue';
import { siteContent } from '../generated/content';
import { LINKS } from '../lib/util';
import PublicationItem from '../components/PublicationItem.vue';
import PageHead from '../components/PageHead.vue';

type Filter = 'all' | 'preprint' | 'peer';
const filter = ref<Filter>('all');
const query = ref('');

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'preprint', label: 'Preprints' },
  { id: 'peer', label: 'Peer-reviewed' },
];

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return siteContent.citations.filter((c) => {
    if (filter.value === 'preprint' && !c.isPreprint) return false;
    if (filter.value === 'peer' && c.isPreprint) return false;
    if (!q) return true;
    return [c.title, c.venue, c.year, ...c.authors.map((a) => a.name)].join(' ').toLowerCase().includes(q);
  });
});

const byYear = computed(() => {
  const groups = new Map<string, typeof filtered.value>();
  for (const c of filtered.value) {
    groups.set(c.year, [...(groups.get(c.year) ?? []), c]);
  }
  return [...groups.entries()];
});
</script>

<template>
  <div>
    <PageHead title="Publications">
      Publications and preprints from the lab and from our collaborations. Lab members are shown in bold. For a complete
      record, see Alejandro Sifrim's <a :href="LINKS.scholar">Google Scholar</a> or <a :href="LINKS.orcid">ORCID</a> profile.
    </PageHead>

    <div class="wrap pubpage">
      <div class="controls">
        <div class="controls__left">
          <div class="filters" role="group" aria-label="Filter publications">
            <button
              v-for="f in filters"
              :key="f.id"
              type="button"
              class="chip"
              :aria-pressed="filter === f.id"
              @click="filter = f.id"
            >
              {{ f.label }}
            </button>
          </div>
          <p class="meta controls__count" aria-live="polite">
            {{ filtered.length }} {{ filtered.length === 1 ? 'publication' : 'publications' }}
          </p>
        </div>
        <label class="field controls__search">
          <span class="visually-hidden">Search publications</span>
          <input v-model="query" type="search" placeholder="Search by title, author, journal or year" />
        </label>
      </div>

      <section v-for="[year, items] in byYear" :key="year" class="year">
        <h2 class="year__label">{{ year }}</h2>
        <ul class="pubs">
          <PublicationItem v-for="p in items" :key="p.id" :pub="p" />
        </ul>
      </section>

      <p v-if="!filtered.length" class="lead empty">No publications match this search.</p>
    </div>
  </div>
</template>

<style scoped>
.pubpage {
  padding-block: var(--s-6) var(--section);
}

.controls {
  display: grid;
  gap: var(--s-3);
}

.controls__left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3) var(--s-5);
}

/* the filters and the count on the left, the search on the right half of the page */
@media (min-width: 900px) {
  .controls {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
    column-gap: var(--s-8);
  }
}

.year {
  display: grid;
  gap: var(--s-3);
  margin-top: var(--s-7);
}

@media (min-width: 900px) {
  .year {
    grid-template-columns: 8rem minmax(0, 1fr);
    gap: var(--s-6);
  }
}

.year__label {
  font-size: var(--t-h2);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

@media (min-width: 900px) {
  .year__label {
    position: sticky;
    top: calc(var(--nav-h) + var(--s-5));
    align-self: start;
    padding-top: var(--s-4);
  }
}

.empty {
  margin-top: var(--s-7);
}
</style>
