<script setup lang="ts">
import { computed } from 'vue';
import type { CitationItem } from '../types/content';
import { formatDate } from '../lib/util';

const props = withDefaults(defineProps<{ pub: CitationItem; headingLevel?: 'h3' | 'h4' | 'p'; maxAuthors?: number }>(), {
  headingLevel: 'h3',
  maxAuthors: 14,
});

/** Keep long consortium author lists readable while always showing every lab member. */
const authors = computed(() => {
  const all = props.pub.authors;
  if (all.length <= props.maxAuthors) return { shown: all, hidden: 0 };
  const keep = new Set<number>([0, 1, 2, all.length - 1]);
  all.forEach((a, i) => {
    if (a.member) keep.add(i);
  });
  const shown = all.filter((_, i) => keep.has(i));
  return { shown, hidden: all.length - shown.length };
});
</script>

<template>
  <li class="pub">
    <p class="pub__meta">
      <span class="pub__venue">{{ pub.venue }}</span>
      <span aria-hidden="true">·</span>
      <time :datetime="pub.date">{{ formatDate(pub.date, 'month') }}</time>
      <span v-if="pub.isPreprint" class="pub__tag">Preprint</span>
    </p>
    <component :is="headingLevel" class="pub__title">
      <a :href="pub.link">{{ pub.title }}</a>
    </component>
    <p class="pub__authors">
      <template v-for="(a, i) in authors.shown" :key="a.name">
        <RouterLink v-if="a.member" :to="`/team/${a.member}`" class="is-member">{{ a.name }}</RouterLink>
        <span v-else>{{ a.name }}</span>
        <span v-if="i < authors.shown.length - 1">, </span>
      </template>
      <span v-if="authors.hidden"> (and {{ authors.hidden }} more)</span>
    </p>
  </li>
</template>

<style scoped>
.pub__authors a.is-member {
  text-decoration: none;
}

.pub__authors a.is-member:hover {
  text-decoration: underline;
  text-decoration-color: var(--bio);
}
</style>
