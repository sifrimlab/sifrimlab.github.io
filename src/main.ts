import { createApp, createSSRApp } from 'vue';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import App from './App.vue';
import { createAppRouter } from './router';

const container = document.getElementById('app')!;
// Pages are prerendered at build time: hydrate them. In dev the container is empty: plain mount.
const hydrate = Boolean(container.firstElementChild) && !container.hasAttribute('data-fresh');
if (!hydrate) container.innerHTML = '';
const app = hydrate ? createSSRApp(App) : createApp(App);
const router = createAppRouter(false);
app.use(router);
void router.isReady().then(() => app.mount(container));
