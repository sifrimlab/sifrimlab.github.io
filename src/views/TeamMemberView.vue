<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { siteContent } from '../generated/content';
import { initials, withBase } from '../lib/util';
import PublicationItem from '../components/PublicationItem.vue';
import NotFoundView from './NotFoundView.vue';

const route = useRoute();

const person = computed(() => siteContent.team.find((m) => m.slug === String(route.params.slug ?? '')));

const themes = computed(() => siteContent.research.filter((t) => person.value && t.people.includes(person.value.slug)));

const pubs = computed(() =>
  person.value ? siteContent.citations.filter((c) => c.authors.some((a) => a.member === person.value!.slug)) : [],
);

const links = computed(() => {
  const l = person.value?.links ?? {};
  return [
    l.googleScholar && { label: 'Google Scholar', href: `https://scholar.google.com/citations?user=${l.googleScholar}` },
    l.orcid && { label: 'ORCID', href: `https://orcid.org/${l.orcid}` },
    l.github && { label: 'GitHub', href: `https://github.com/${l.github}` },
    l.linkedin && { label: 'LinkedIn', href: `https://www.linkedin.com/in/${l.linkedin}` },
    l.twitter && { label: 'X / Twitter', href: `https://x.com/${l.twitter}` },
    l.website && { label: 'Website', href: l.website },
  ].filter((x): x is { label: string; href: string } => Boolean(x));
});
</script>

<template>
  <NotFoundView v-if="!person" />
  <article v-else class="wrap member">
    <p class="crumb meta">
      <RouterLink to="/team">Team</RouterLink>
      <span aria-hidden="true"> / </span>
      <span>{{ person.isAlumni ? 'Alumni' : person.roleLabel }}</span>
    </p>

    <div class="member__grid">
      <div class="member__aside">
        <div class="portrait__img member__img">
          <img v-if="person.hasPhoto" :src="withBase(person.image)" :alt="person.name" />
          <span v-else class="portrait__initials" aria-hidden="true">{{ initials(person.name) }}</span>
        </div>
        <ul v-if="links.length" class="member__links">
          <li v-for="l in links" :key="l.label">
            <a :href="l.href" class="more more--ext">{{ l.label }}</a>
          </li>
        </ul>
      </div>

      <div class="member__main">
        <h1>{{ person.name }}</h1>
        <p class="member__role">{{ person.roleLabel }}</p>
        <div v-if="person.bioHtml" class="prose member__bio" v-html="person.bioHtml"></div>

        <section v-if="themes.length" class="member__block">
          <h2 class="label">Research</h2>
          <ul class="member__themes">
            <li v-for="t in themes" :key="t.slug">
              <RouterLink :to="{ path: '/research', hash: `#${t.slug}` }">{{ t.title }}</RouterLink>
            </li>
          </ul>
        </section>

        <section v-if="pubs.length" class="member__block">
          <h2 class="label">Publications listed on this site</h2>
          <ul class="pubs">
            <PublicationItem v-for="p in pubs" :key="p.id" :pub="p" heading-level="h3" :max-authors="10" />
          </ul>
        </section>
      </div>
    </div>
  </article>
</template>

<style scoped>
.member {
  padding-block: var(--s-7) var(--section);
}

.crumb a {
  color: var(--muted);
}

.member__grid {
  display: grid;
  gap: var(--s-6);
  margin-top: var(--s-6);
}

@media (min-width: 860px) {
  .member__grid {
    grid-template-columns: 18rem minmax(0, 1fr);
    gap: var(--s-8);
  }

  .member__aside {
    position: sticky;
    top: calc(var(--nav-h) + var(--s-5));
    align-self: start;
  }
}

.member__img {
  max-width: 18rem;
}

.member__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member__links {
  list-style: none;
  display: grid;
  gap: var(--s-3);
  margin-top: var(--s-5);
  justify-items: start;
}

.member__role {
  margin-top: var(--s-3);
  font-size: var(--t-lead);
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--muted);
}

.member__bio {
  margin-top: var(--s-6);
}

.member__block {
  margin-top: var(--s-7);
}

.member__block > .label {
  display: flex;
  margin-bottom: var(--s-4);
}

.member__themes {
  list-style: none;
  display: grid;
  gap: var(--s-2);
}

.member__themes a {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  text-decoration-color: var(--bio);
}
</style>
