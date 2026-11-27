<script setup lang="ts">
import { siteContent } from '../generated/content';
import { initials, withBase } from '../lib/util';
import type { TeamMember } from '../types/content';
import PageHead from '../components/PageHead.vue';

const team = siteContent.team;
const pi = team.filter((m) => m.role === 'pi');

const groups: Array<{ title: string; members: TeamMember[] }> = [
  { title: 'Postdoctoral researchers & staff', members: team.filter((m) => m.role === 'postdoc' || m.role === 'staff') },
  { title: 'Doctoral Candidates', members: team.filter((m) => m.role === 'phd' || m.role === 'programmer') },
  { title: "Master's Students", members: team.filter((m) => m.role === 'grad') },
].filter((g) => g.members.length);

const alumni = team.filter((m) => m.isAlumni);
</script>

<template>
  <div>
    <PageHead title="Team">
      We are a team of enthusiastic researchers from all walks of life that want to push the frontier of bioinformatics.
      We strive to build an inclusive and collaborative environment for research.
    </PageHead>

    <div class="wrap teampage">
      <section v-for="m in pi" :key="m.slug" class="group pi">
        <h2 class="label group__title">Group leader</h2>
        <RouterLink :to="`/team/${m.slug}`" class="pi__card">
          <span class="portrait__img pi__img">
            <img v-if="m.hasPhoto" :src="withBase(m.image)" :alt="m.name" />
          </span>
          <span class="pi__text">
            <span class="pi__name">{{ m.name }}</span>
            <span class="portrait__role">{{ m.roleLabel }}</span>
            <span class="pi__excerpt">{{ m.excerpt }}</span>
            <span class="more">Read more</span>
          </span>
        </RouterLink>
      </section>

      <section v-for="g in groups" :key="g.title" class="group">
        <h2 class="label group__title">{{ g.title }}</h2>
        <ul class="grid">
          <li v-for="m in g.members" :key="m.slug" data-reveal>
            <RouterLink :to="`/team/${m.slug}`" class="portrait">
              <span class="portrait__img">
                <img v-if="m.hasPhoto" :src="withBase(m.image)" :alt="m.name" loading="lazy" />
                <span v-else class="portrait__initials" aria-hidden="true">{{ initials(m.name) }}</span>
              </span>
              <span class="portrait__name">{{ m.name }}</span>
              <span class="portrait__role">{{ m.roleLabel }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="alumni.length" class="group alumni">
        <h2 class="label group__title">Previous members</h2>
        <p class="lead alumni__text">
          Remembered with enduring gratitude, these former lab members have pursued other academic endeavors, embraced new
          professional roles, or embarked on different paths. Their contributions resonate in the realm of science and
          linger in our hearts.
        </p>
        <ul class="alumni__list">
          <li v-for="m in alumni" :key="m.slug">
            <RouterLink :to="`/team/${m.slug}`" class="alumni__photo" tabindex="-1" aria-hidden="true">
              <img v-if="m.hasPhoto" :src="withBase(m.image)" alt="" loading="lazy" />
              <span v-else class="alumni__initials">{{ initials(m.name) }}</span>
            </RouterLink>
            <div class="alumni__text-col">
              <RouterLink :to="`/team/${m.slug}`" class="alumni__name">{{ m.name }}</RouterLink>
              <span v-if="m.roleLabel" class="meta">{{ m.roleLabel }}</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.teampage {
  padding-bottom: var(--section);
}

.group {
  padding-top: var(--s-8);
}

.group__title {
  display: flex;
  padding-bottom: var(--s-3);
  margin-bottom: var(--s-6);
  border-bottom: 1px solid var(--rule);
}

.grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 12.5rem), 1fr));
  gap: var(--s-7) var(--s-5);
}

@media (max-width: 520px) {
  .grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--s-6) var(--s-4);
  }

  .portrait__name {
    font-size: 1.05rem;
  }
}

.pi__card {
  display: grid;
  gap: var(--s-5) var(--s-7);
  text-decoration: none;
  align-items: center;
}

@media (min-width: 720px) {
  .pi__card {
    grid-template-columns: 16rem minmax(0, 1fr);
  }
}

.pi__img {
  max-width: 16rem;
}

.pi__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pi__text {
  display: grid;
  gap: var(--s-2);
  justify-items: start;
}

.pi__name {
  font-family: var(--font-serif);
  font-size: var(--t-h2);
  line-height: 1.1;
}

.pi__card:hover .pi__name {
  text-decoration: underline;
  text-decoration-color: var(--bio);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.15em;
}

.pi__excerpt {
  margin-block: var(--s-3);
  font-family: var(--font-serif);
  font-size: var(--t-prose);
  color: var(--ink-2);
  max-width: 60ch;
}

.alumni__text {
  margin-bottom: var(--s-6);
}

.alumni__list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
  gap: var(--s-5) var(--s-6);
}

/* a card: the photo on the left, the name and former role beside it */
.alumni__list li {
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr);
  align-items: center;
  gap: var(--s-4);
  padding-bottom: var(--s-4);
  border-bottom: 1px solid var(--rule);
}

.alumni__photo {
  text-decoration: none;
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--paper-2);
}

.alumni__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.92);
  transition:
    transform 0.6s var(--ease),
    filter 0.4s var(--ease);
}

.alumni__list li:hover .alumni__photo img {
  transform: scale(1.04);
  filter: saturate(1);
}

.alumni__initials {
  font-family: var(--font-serif);
  font-size: 1.3rem;
  color: var(--muted);
}

.alumni__text-col {
  display: grid;
  gap: var(--s-1);
  justify-items: start;
}

.alumni__name {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  line-height: 1.25;
  text-decoration: none;
}

.alumni__name:hover {
  text-decoration: underline;
  text-decoration-color: var(--bio);
}
</style>
