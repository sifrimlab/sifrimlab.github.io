<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { siteContent } from '../generated/content';
import { formatDate } from '../lib/util';
import NotFoundView from './NotFoundView.vue';

const route = useRoute();
const index = computed(() => siteContent.news.findIndex((p) => p.slug === String(route.params.slug ?? '')));
const post = computed(() => siteContent.news[index.value]);
const newer = computed(() => (index.value > 0 ? siteContent.news[index.value - 1] : undefined));
const older = computed(() => (index.value >= 0 ? siteContent.news[index.value + 1] : undefined));
</script>

<template>
  <NotFoundView v-if="!post" />
  <article v-else class="wrap post">
    <p class="meta">
      <RouterLink to="/news">News</RouterLink>
      <span aria-hidden="true"> / </span>
      <time :datetime="post.date">{{ formatDate(post.date) }}</time>
    </p>
    <h1 class="post__title">{{ post.title }}</h1>
    <div class="prose post__body" v-html="post.bodyHtml"></div>

    <nav class="post__nav" aria-label="More news">
      <RouterLink v-if="older" :to="`/news/${older.slug}`" class="post__nav-link">
        <span class="label">Previous</span>
        <span class="post__nav-title">{{ older.title }}</span>
      </RouterLink>
      <span v-else></span>
      <RouterLink v-if="newer" :to="`/news/${newer.slug}`" class="post__nav-link post__nav-link--next">
        <span class="label">Next</span>
        <span class="post__nav-title">{{ newer.title }}</span>
      </RouterLink>
    </nav>
  </article>
</template>

<style scoped>
.post {
  padding-block: var(--s-7) var(--section);
}

.post .meta a {
  color: var(--muted);
}

.post__title {
  margin-top: var(--s-4);
  max-width: 26ch;
  font-size: clamp(2rem, 1.5rem + 2vw, 3.2rem);
}

.post__body {
  margin-top: var(--s-7);
}

.post__nav {
  display: grid;
  gap: var(--s-5);
  margin-top: var(--s-9);
  padding-top: var(--s-5);
  border-top: 1px solid var(--rule);
}

@media (min-width: 720px) {
  .post__nav {
    grid-template-columns: 1fr 1fr;
  }
}

.post__nav-link {
  display: grid;
  gap: var(--s-2);
  text-decoration: none;
}

.post__nav-link--next {
  text-align: right;
  justify-items: end;
}

.post__nav-title {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  line-height: 1.3;
  max-width: 34ch;
}

.post__nav-link:hover .post__nav-title {
  text-decoration: underline;
  text-decoration-color: var(--bio);
}
</style>
