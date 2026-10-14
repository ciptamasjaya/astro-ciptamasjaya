import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import rehypeSlug from 'rehype-slug';

// Multi-environment: lokal `SITE_URL=http://astro-ciptamasjaya.lan`, produksi
// `SITE_URL=https://www.ciptamasjaya.co.id` (lihat AGENTS.md).
const siteUrl = process.env.SITE_URL || 'http://astro-ciptamasjaya.lan';

export default defineConfig({
  site: siteUrl,
  markdown: {
    rehypePlugins: [rehypeSlug],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
