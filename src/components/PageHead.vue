<script setup lang="ts">
/**
 * Introduction of a sub-page: its name as the one title, and a short paragraph (the default
 * slot) that says what the page is for. Deliberately quiet: no label, no hero scale. From
 * 900px up the title and the paragraph sit side by side on the same grid as the page content.
 */
defineProps<{ title: string }>();
</script>

<template>
  <header class="page-head">
    <div class="wrap page-head__grid">
      <h1 class="page-head__title">{{ title }}</h1>
      <p v-if="$slots.default" class="page-head__lead"><slot /></p>
    </div>
  </header>
</template>

<style scoped>
.page-head {
  padding-block: clamp(2rem, 1.4rem + 2.2vw, 3.75rem) clamp(1.75rem, 1.2rem + 1.6vw, 3rem);
  border-bottom: 1px solid var(--rule);
}

.page-head__grid {
  display: grid;
  gap: var(--s-4);
  align-items: baseline;
}

.page-head__title {
  font-size: var(--t-page);
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.page-head__lead {
  max-width: 60ch;
  font-family: var(--font-serif);
  font-size: var(--t-lead);
  line-height: 1.5;
  color: var(--ink-2);
}

.page-head__lead :deep(a) {
  color: var(--comp-text);
}

@media (min-width: 900px) {
  /* same proportions as .split, so the paragraph lines up with the content below */
  .page-head__grid {
    grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
    gap: var(--s-8);
  }
}
</style>
