<script setup lang="ts">
import { siteContent } from '../generated/content';
import { formatDate, LINKS } from '../lib/util';
import PageHead from '../components/PageHead.vue';

const tracks = siteContent.join;
const openings = siteContent.news.filter((p) => p.tags.includes('job'));
</script>

<template>
  <div>
    <PageHead title="Join us">
      The lab brings together people trained in biomedical science, bioinformatics, engineering and computer science.
      Below is how to get in touch for each career stage.
    </PageHead>

    <div class="wrap joinpage">
      <section v-if="openings.length" class="block">
        <h2 class="label block__title">Open positions</h2>
        <ul class="openings">
          <li v-for="p in openings" :key="p.slug">
            <RouterLink :to="`/news/${p.slug}`" class="opening">
              <time class="meta" :datetime="p.date">Posted {{ formatDate(p.date) }}</time>
              <span class="opening__title">{{ p.title }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section class="block">
        <h2 class="label block__title">How to apply</h2>
        <div class="tracks">
          <article v-for="t in tracks" :key="t.slug" class="track">
            <h3>{{ t.title }}</h3>
            <div class="prose track__body" v-html="t.bodyHtml"></div>
          </article>
        </div>
      </section>

      <section class="block contact">
        <h2 class="label block__title">Contact</h2>
        <p class="lead">
          If you have any inquiries or would like to get in touch with us, please contact the LMIB group leader, Alejandro
          Sifrim. His contact details and a brief bio are on the KU Leuven “Who is Who” page.
        </p>
        <a :href="LINKS.contact" class="button contact__btn">Contact via KU Leuven Who is Who</a>
      </section>
    </div>
  </div>
</template>

<style scoped>
.joinpage {
  padding-bottom: var(--section);
}

.block {
  padding-top: var(--s-8);
}

.block__title {
  display: flex;
  padding-bottom: var(--s-3);
  margin-bottom: var(--s-5);
  border-bottom: 1px solid var(--rule);
}

.openings {
  list-style: none;
  display: grid;
  gap: var(--s-4);
}

.opening {
  display: grid;
  gap: var(--s-2);
  padding: var(--s-5);
  border-left: 3px solid var(--bio);
  background: var(--surface);
  border-radius: 0 var(--radius) var(--radius) 0;
  text-decoration: none;
}

.opening__title {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  line-height: 1.3;
}

.opening:hover .opening__title {
  text-decoration: underline;
  text-decoration-color: var(--bio);
}

.tracks {
  display: grid;
  gap: var(--s-7) var(--s-6);
}

@media (min-width: 900px) {
  .tracks {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.track h3 {
  padding-top: var(--s-3);
  border-top: 2px solid var(--comp);
}

.track:nth-child(2) h3 {
  border-top-color: var(--bio);
}

.track__body {
  margin-top: var(--s-4);
  font-size: 1.05rem;
}

.contact__btn {
  margin-top: var(--s-5);
}
</style>
