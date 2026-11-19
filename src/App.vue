<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppNav from './components/AppNav.vue';
import AppFooter from './components/AppFooter.vue';
import { headFor } from './head';

const route = useRoute();
const router = useRouter();

let observer: IntersectionObserver | undefined;

function observeReveals(): void {
  if (!observer) return;
  document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => observer!.observe(el));
}

function applyHead(): void {
  const head = headFor(route);
  document.title = head.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', head.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', head.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', head.description);
}

watch(
  () => route.fullPath,
  async () => {
    if (typeof document === 'undefined') return;
    applyHead();
    await nextTick();
    observeReveals();
  },
);

onMounted(() => {
  (window as unknown as { __lmibMounted: boolean }).__lmibMounted = true;
  applyHead();

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer!.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    observeReveals();
  }

  // Internal links inside rendered Markdown (v-html) should use the router.
  const base = import.meta.env.BASE_URL;
  document.addEventListener('click', (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement | null)?.closest('a');
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith(base) || href.startsWith('//')) return;
    if (!anchor.closest('.prose')) return;
    event.preventDefault();
    void router.push(`/${href.slice(base.length)}`);
  });
});
</script>

<template>
  <div class="shell">
    <AppNav />
    <main id="main" tabindex="-1">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
}

#main {
  flex: 1;
}

#main:focus {
  outline: none;
}
</style>
