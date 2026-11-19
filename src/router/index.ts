import { createMemoryHistory, createRouter, createWebHistory, type Router, type RouteRecordRaw } from 'vue-router';
import LandingView from '../views/LandingView.vue';
import ResearchView from '../views/ResearchView.vue';
import PublicationsView from '../views/PublicationsView.vue';
import TeamView from '../views/TeamView.vue';
import TeamMemberView from '../views/TeamMemberView.vue';
import NewsView from '../views/NewsView.vue';
import NewsPostView from '../views/NewsPostView.vue';
import JoinView from '../views/JoinView.vue';
import LegalView from '../views/LegalView.vue';
import NotFoundView from '../views/NotFoundView.vue';

/** Research slugs of the previous site version, mapped onto the merged Research page. */
const LEGACY_RESEARCH: Record<string, string> = {
  'multimodal-integration': 'multi-omic-integration',
  'explainable-ai': 'explainable-ai',
  'perturbation-prediction': 'lipid-perturbation',
  'spatial-data-processing': 'multi-omic-integration',
  'clinical-genomics': 'disease-genetics',
};

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: LandingView },
  { path: '/index.html', redirect: '/' },
  { path: '/research', name: 'research', component: ResearchView },
  {
    path: '/research/:slug',
    redirect: (to) => {
      const slug = String(to.params.slug);
      return { path: '/research', hash: `#${LEGACY_RESEARCH[slug] ?? slug}` };
    },
  },
  { path: '/projects', redirect: '/research' },
  { path: '/publications', name: 'publications', component: PublicationsView },
  { path: '/team', name: 'team', component: TeamView },
  { path: '/team/:slug', name: 'team-member', component: TeamMemberView },
  { path: '/members/:slug(.*)', redirect: (to) => `/team/${String(to.params.slug).replace(/\.html$/, '')}` },
  { path: '/news', name: 'news', component: NewsView },
  { path: '/news/:slug', name: 'news-post', component: NewsPostView },
  { path: '/join', name: 'join', component: JoinView },
  { path: '/joinus', redirect: '/join' },
  { path: '/contact', redirect: '/join' },
  { path: '/privacy', name: 'privacy', component: LegalView },
  { path: '/terms', name: 'terms', component: LegalView },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
];

export function createAppRouter(ssr = false): Router {
  const base = import.meta.env.BASE_URL;
  return createRouter({
    history: ssr ? createMemoryHistory(base) : createWebHistory(base),
    routes,
    scrollBehavior(to, from, saved) {
      if (saved) return saved;
      if (to.hash) return { el: to.hash, top: 88 };
      if (to.path === from.path) return false;
      return { top: 0 };
    },
  });
}
