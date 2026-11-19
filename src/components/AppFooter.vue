<script setup lang="ts">
import { siteContent } from '../generated/content';
import { LINKS } from '../lib/util';

const year = new Date().getFullYear();
const { home } = siteContent;
</script>

<template>
  <footer class="foot">
    <div class="wrap">
      <div class="foot__top">
        <div class="foot__id">
          <p class="foot__name">{{ home.title }}</p>
          <p class="foot__aff">{{ home.affiliation }}</p>
        </div>

        <nav class="foot__col" aria-label="Site">
          <p class="label">Explore</p>
          <ul>
            <li><RouterLink to="/research">Research</RouterLink></li>
            <li><RouterLink to="/publications">Publications</RouterLink></li>
            <li><RouterLink to="/team">Team</RouterLink></li>
            <li><RouterLink to="/news">News</RouterLink></li>
            <li><RouterLink to="/join">Join us</RouterLink></li>
          </ul>
        </nav>

        <div class="foot__col">
          <p class="label">Elsewhere</p>
          <ul>
            <li><a :href="LINKS.github">GitHub · sifrimlab</a></li>
            <li><a :href="LINKS.scholar">Google Scholar</a></li>
            <li><a :href="LINKS.orcid">ORCID</a></li>
            <li><a :href="LINKS.lisco">LISCO</a></li>
            <li><a :href="LINKS.kuleuven">KU Leuven</a></li>
          </ul>
        </div>

        <div class="foot__col">
          <p class="label">Contact</p>
          <p class="foot__text">
            To get in touch, please contact group leader Alejandro Sifrim through his
            <a :href="LINKS.contact">KU Leuven “Who is Who” page</a>.
          </p>
        </div>
      </div>

      <div class="foot__bottom">
        <p>© {{ year }} LMIB, KU Leuven</p>
        <p class="foot__legal">
          <RouterLink to="/privacy">Privacy</RouterLink>
          <RouterLink to="/terms">Terms of use</RouterLink>
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.foot {
  /* big screens: the footer grows far less than the page */
  zoom: var(--chrome-zoom, 1);
  margin-top: auto;
  background: var(--paper-2);
  border-top: 1px solid var(--rule);
  font-size: var(--t-small);
}

.foot__top {
  display: grid;
  gap: var(--s-7) var(--s-6);
  padding-block: var(--s-8) var(--s-7);
}

@media (min-width: 640px) {
  .foot__top {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1000px) {
  .foot__top {
    grid-template-columns: 5fr 2fr 2fr 3fr;
  }
}

.foot__name {
  font-family: var(--font-serif);
  font-size: 1.45rem;
  line-height: 1.2;
  max-width: 20ch;
}

.foot__aff {
  margin-top: var(--s-3);
  color: var(--muted);
  max-width: 34ch;
}

.foot__col ul {
  list-style: none;
  margin-top: var(--s-3);
  display: grid;
  gap: var(--s-2);
}

.foot__col a {
  color: var(--ink-2);
  text-decoration: none;
}

.foot__col a:hover {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--bio);
}

.foot__text {
  margin-top: var(--s-3);
  color: var(--ink-2);
  max-width: 34ch;
}

.foot__text a {
  text-decoration: underline;
}

.foot__bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--s-3);
  padding-block: var(--s-5);
  border-top: 1px solid var(--rule);
  color: var(--muted);
}

.foot__legal {
  display: flex;
  gap: var(--s-5);
}

.foot__legal a {
  color: var(--muted);
}
</style>
