import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// BASE_PATH lets PR previews live under a sub-path (e.g. /preview/pr-12/).
const base = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/');

export default defineConfig({
  base,
  plugins: [vue()],
  define: {
    // HYDRATION_DEBUG=1 npm run build → log SSR/client hydration mismatches in the browser console
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(Boolean(process.env.HYDRATION_DEBUG)),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
});
