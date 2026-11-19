<script setup lang="ts">
/**
 * The lab's "pair" glyph: a biology node (logo orange) linked to a computation node (blue).
 * Used as a section marker to signal that both carry equal weight.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
  <svg class="pairmark" :width="size" :height="size * 0.42" viewBox="0 0 26 11" aria-hidden="true" focusable="false">
    <line x1="5" y1="5.5" x2="21" y2="5.5" stroke="currentColor" stroke-width="1.4" opacity="0.45" />
    <circle cx="5" cy="5.5" r="4.2" fill="var(--bio)" />
    <circle cx="21" cy="5.5" r="4.2" fill="var(--comp)" />
  </svg>
</template>

<style scoped>
.pairmark {
  flex: none;
  display: inline-block;
}
</style>
