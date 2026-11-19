<script setup lang="ts">
import type { TeamMember } from '../types/content';
import { initials, withBase } from '../lib/util';

defineProps<{ person: TeamMember }>();
</script>

<template>
  <RouterLink :to="`/team/${person.slug}`" class="person">
    <span class="avatar person__avatar">
      <img v-if="person.hasPhoto" :src="withBase(person.image)" alt="" loading="lazy" width="44" height="44" />
      <span v-else aria-hidden="true">{{ initials(person.name) }}</span>
    </span>
    <span class="person__text">
      <span class="person__name">{{ person.name }}</span>
      <span class="person__role">{{ person.roleLabel }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.person {
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
  text-decoration: none;
  min-width: 0;
}

.person__avatar {
  width: 44px;
  flex: none;
  font-size: 0.95rem;
}

.person__text {
  display: grid;
  line-height: 1.25;
  min-width: 0;
}

.person__name {
  font-weight: 600;
  font-size: var(--t-small);
}

.person:hover .person__name {
  text-decoration: underline;
  text-decoration-color: var(--bio);
}

.person__role {
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
