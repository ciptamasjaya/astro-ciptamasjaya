import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import rehypeSlug from 'rehype-slug';
import { resolveSiteUrl } from './src/utils/site-url';

// Multi-environment otomatis: lokal `.lan`, Vercel via VERCEL_* (tanpa setting),
// produksi via SITE_URL saat go-live. Lihat AGENTS.md + src/utils/site-url.ts.
const siteUrl = resolveSiteUrl();

export default defineConfig({
  site: siteUrl,
  markdown: {
    rehypePlugins: [rehypeSlug],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
