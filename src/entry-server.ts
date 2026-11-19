import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import App from './App.vue';
import { createAppRouter } from './router';
import { headFor, type HeadData } from './head';

export async function render(url: string): Promise<{ html: string; head: HeadData; status: number }> {
  const app = createSSRApp(App);
  const router = createAppRouter(true);
  app.use(router);
  await router.push(url);
  await router.isReady();
  const route = router.currentRoute.value;
  const html = await renderToString(app);
  return { html, head: headFor(route), status: route.name === 'not-found' ? 404 : 200 };
}
