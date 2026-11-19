<script setup lang="ts">
import PairMark from '../components/PairMark.vue';
</script>

<template>
  <section class="wrap notfound">
    <PairMark :size="56" />
    <h1>This page could not be found</h1>
    <p class="lead">The page may have moved when the website was reorganised.</p>
    <div class="link-row">
      <RouterLink to="/" class="more">Home</RouterLink>
      <RouterLink to="/research" class="more">Research</RouterLink>
      <RouterLink to="/team" class="more">Team</RouterLink>
      <RouterLink to="/news" class="more">News</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.notfound {
  padding-block: var(--s-10);
  display: grid;
  gap: var(--s-5);
  justify-items: start;
}
</style>
