import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { contentBlockSchema } from './content/block-schema.ts';

/**
 * Kontrak frontmatter konten (satu sumber kebenaran).
 * Data hasil migrasi WordPress (scripts/migrate-wp.mjs) harus lolos skema ini.
 * Block opsional memakai registry csms (block-schema.ts).
 */

const sharedIdentity = {
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  draft: z.boolean().default(false),
  image: z.string().optional(),
};

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    ...sharedIdentity,
    type: z.literal('article'),
    /** Editorial content vs. local-search landing pages; legacy articles default to editorial. */
    contentType: z.enum(['editorial', 'local-seo']).default('editorial'),
    /** Slug asli WordPress (bagian akhir URL dated). */
    slug: z.string().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().optional(),
    /** Slug kategori WordPress, mis. `layanan/riksa-uji-pesawat-angkat-dan-angkut`. */
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    relatedService: z.number().int().positive().optional(),
    relatedPage: z.number().int().positive().optional(),
    /** Alt text untuk gambar utama (og:image:alt) — salinan persis dari WordPress asli. */
    imageAlt: z.string().optional(),
    blocks: z.array(contentBlockSchema).optional(),
  }),
});

/** Halaman WordPress: about, layanan (bertingkat), tanya-jawab, contact, my-account. */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    ...sharedIdentity,
    type: z.literal('page'),
    /** Path rute lengkap tanpa slash awal/akhir, mis. `layanan/riksa-uji-lift-dan-eskalator/riksa-uji-lift-penumpang`. */
    path: z.string().min(1),
    /** Halaman khusus yang sudah dibangun custom (home, blog, about, contact) tidak dirender generik. */
    custom: z.boolean().default(false),
    parentId: z.number().int().positive().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    blocks: z.array(contentBlockSchema).optional(),
  }),
});

/** Kategori WordPress — /category/<slug>/ harus tetap hidup. */
const categories = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/categories' }),
  schema: z.object({
    id: z.number().int().positive(),
    type: z.literal('category'),
    /** Slug lengkap termasuk parent, mis. `layanan/riksa-uji-pesawat-angkat-dan-angkut`. */
    slug: z.string(),
    title: z.string(),
    description: z.string().default(''),
    parentId: z.number().int().positive().optional(),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    id: z.number().int().positive(),
    type: z.literal('author'),
    slug: z.string(),
    name: z.string(),
    bio: z.string().default(''),
  }),
});

export const collections = { articles, pages, categories, authors };
