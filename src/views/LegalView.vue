<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { LINKS } from '../lib/util';
import PageHead from '../components/PageHead.vue';

const route = useRoute();
const isPrivacy = computed(() => route.name === 'privacy');
</script>

<template>
  <div>
    <PageHead :title="isPrivacy ? 'Privacy' : 'Terms of use'" />
    <article class="wrap legal">
      <template v-if="isPrivacy">
        <div class="prose legal__body">
          <p>
            This is a static website of the Laboratory of Multi-omic Integrative Bioinformatics (LMIB) at KU Leuven. It sets
            no cookies and uses no analytics or tracking. Fonts and images are served from this site itself.
          </p>
          <p>
            The site is hosted on GitHub Pages. As the hosting provider, GitHub may process technical data such as IP
            addresses when you visit; see the
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub General Privacy Statement</a>.
          </p>
          <p>
            A colour-theme preference, if you choose one, is stored only in your own browser.
          </p>
        </div>
      </template>
      <template v-else>
        <div class="prose legal__body">
          <p>
            The content of this website is provided by the Laboratory of Multi-omic Integrative Bioinformatics (LMIB) at KU
            Leuven for information purposes.
          </p>
          <p>
            Software linked from this site is distributed under the licence stated in its own repository on
            <a :href="LINKS.github">GitHub</a>. Publications are subject to the terms of their publishers.
          </p>
        </div>
      </template>
    </article>
  </div>
</template>

<style scoped>
.legal {
  padding-block: var(--s-7) var(--section);
}
</style>
