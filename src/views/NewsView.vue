<script setup lang="ts">
import { computed, ref } from 'vue';
import { siteContent } from '../generated/content';
import { formatDate, withBase } from '../lib/util';
import PageHead from '../components/PageHead.vue';

const TAG_LABELS: Record<string, string> = {
  paper: 'Papers',
  research: 'Research',
  awards: 'Awards',
  event: 'Events',
  conference: 'Conferences',
  job: 'Positions',
};

const active = ref('all');
const tags = computed(() => {
  const s = new Set<string>();
  siteContent.news.forEach((p) => p.tags.forEach((t) => s.add(t)));
  return ['all', ...[...s].filter((t) => TAG_LABELS[t])];
});

const posts = computed(() =>
  active.value === 'all' ? siteContent.news : siteContent.news.filter((p) => p.tags.includes(active.value)),
);
</script>

<template>
  <div>
    <PageHead title="News">
      Announcements from the lab: new papers, awards, events and open positions.
    </PageHead>

    <div class="wrap newspage">
      <div class="filters" role="group" aria-label="Filter news">
        <button
          v-for="t in tags"
          :key="t"
          type="button"
          class="chip"
          :aria-pressed="active === t"
          @click="active = t"
        >
          {{ t === 'all' ? 'All' : TAG_LABELS[t] }}
        </button>
      </div>

      <ol class="list">
        <li v-for="post in posts" :key="post.slug" class="item">
          <RouterLink :to="`/news/${post.slug}`" class="item__link">
            <time class="meta item__date" :datetime="post.date">{{ formatDate(post.date) }}</time>
            <span class="item__body">
              <span class="item__title">{{ post.title }}</span>
              <span class="item__excerpt">{{ post.excerpt }}</span>
            </span>
            <span class="item__img">
              <img v-if="post.image" :src="withBase(post.image)" alt="" loading="lazy" />
            </span>
          </RouterLink>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.newspage {
  padding-block: var(--s-6) var(--section);
}

.list {
  list-style: none;
  margin-top: var(--s-6);
  border-top: 1px solid var(--rule);
}

.item {
  border-bottom: 1px solid var(--rule);
}

.item__link {
  display: grid;
  gap: var(--s-3) var(--s-6);
  padding-block: var(--s-5);
  text-decoration: none;
}

@media (min-width: 760px) {
  .item__link {
    grid-template-columns: 10rem minmax(0, 1fr) 9rem;
    align-items: start;
  }
}

.item__body {
  display: grid;
  gap: var(--s-2);
}

.item__title {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  line-height: 1.25;
}

.item__link:hover .item__title {
  text-decoration: underline;
  text-decoration-color: var(--bio);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.15em;
}

.item__excerpt {
  color: var(--muted);
  font-size: var(--t-small);
  max-width: 70ch;
}

.item__img img {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: var(--radius);
  border: 1px solid var(--rule);
}

@media (max-width: 759px) {
  .item__img {
    display: none;
  }
}
</style>
