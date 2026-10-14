#!/usr/bin/env node
/**
 * Migrasi konten WordPress ciptamasjaya.co.id → Astro content collections.
 *
 * Sumber: WP REST API (posts, pages, categories, users, media).
 * Output:
 *   - src/content/articles/<slug>.md        (248 post, URL dated dipertahankan)
 *   - src/content/pages/<path>.md           (29 halaman, path frontmatter)
 *   - src/content/categories/*.json         (11 kategori, slug nested)
 *   - src/content/authors/*.json
 *   - public/wp-content/uploads/...         (featured image diperbaiki tempatnya)
 *
 * Aturan mutlak: tidak boleh ada URL sitemap lama yang 404 — semua post/page/kategori
 * di-petakan 1:1; internal link di-rewrite ke rute relatif yang sama.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import TurndownService from 'turndown';
import * as gfm from 'turndown-plugin-gfm';
import matter from 'gray-matter';

const WP = 'https://www.ciptamasjaya.co.id';
const ROOT = path.resolve(import.meta.dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'src/content/articles');
const PAGES_DIR = path.join(ROOT, 'src/content/pages');
const CATEGORIES_DIR = path.join(ROOT, 'src/content/categories');
const AUTHORS_DIR = path.join(ROOT, 'src/content/authors');
const UPLOADS_PUBLIC = path.join(ROOT, 'public');

/** Layanan inti (path → id) untuk frontmatter relatedService. */
const SERVICE_ID_BY_PATH = {
  'layanan/riksa-uji-pesawat-angkat-dan-angkut': 1,
  'layanan/riksa-uji-pesawat-uap-dan-bejana-tekan': 2,
  'layanan/riksa-uji-pesawat-tenaga-dan-produksi': 3,
  'layanan/riksa-uji-instalasi-listrik-dan-penyalur-petir': 4,
  'layanan/riksa-uji-instalasi-proteksi-kebakaran': 5,
  'layanan/riksa-uji-lift-dan-eskalator': 6,
};

/** Halaman yang dibangun custom (tidak dirender catch-all). */
const CUSTOM_PAGES = new Set(['', 'blog', 'about', 'contact', 'my-account', 'home-2']);

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});
turndown.use(gfm.gfm);
turndown.remove(['script', 'style', 'noscript']);

// Perbaiki link & gambar: absolut WP → relatif situs baru.
turndown.addRule('wpLink', {
  filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
  replacement: (content, node) => {
    const href = normalizeUrl(node.getAttribute('href'));
    if (!href) return content;
    const title = node.getAttribute('title');
    return `[${content}](${href}${title ? ` "${title}"` : ''})`;
  },
});
turndown.addRule('wpImage', {
  filter: (node) => node.nodeName === 'IMG' && node.getAttribute('src'),
  replacement: (content, node) => {
    const src = normalizeUrl(node.getAttribute('src'));
    const alt = node.getAttribute('alt') || '';
    return `![${alt}](${src})`;
  },
});

function normalizeUrl(url) {
  if (!url) return '';
  let u = url.trim();
  // Domain lama → relatif.
  u = u.replace(/^https?:\/\/(www\.)?ciptamasjaya\.co\.id/i, '');
  // Query/fragment WP (utm, paged, dsb.) dihapus untuk link internal.
  if (u.startsWith('/') && !u.startsWith('//')) {
    u = u.split('#')[0];
    u = u.replace(/\?[^?]*$/, '');
    // /page/N/ arsip blog → arsip baru.
    u = u.replace(/^\/blog\/page\/(\d+)\/?$/, '/blog/page/$1/');
    if (!u.endsWith('/') && !path.extname(u)) u += '/';
    return u;
  }
  if (u.startsWith('/wp-content/uploads/')) return u;
  // Eksternal: biarkan.
  return u;
}

/** Path upload WP → path lokal public/ (dipertahankan identik). */
function uploadLocalPath(url) {
  const m = url.match(/\/wp-content\/uploads\/(.+)$/);
  return m ? m[1] : null;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchAll(base) {
  const out = [];
  let page = 1;
  for (;;) {
    const list = await fetchJson(`${base}&page=${page}`);
    out.push(...list);
    if (list.length < 100) break;
    page += 1;
  }
  return out;
}

const strip = (html) => (html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function makeDescription(excerptHtml, contentHtml, title) {
  let desc = strip(excerptHtml);
  if (!desc) {
    const firstPara = (contentHtml || '').match(/<p[^>]*>(.*?)<\/p>/is);
    desc = firstPara ? strip(firstPara[1]) : '';
  }
  if (!desc) desc = title;
  if (desc.length > 300) desc = `${desc.slice(0, 297).replace(/[\s,.;:-]+\S*$/, '')}...`;
  return desc;
}

async function downloadImage(url) {
  const local = uploadLocalPath(url);
  if (!local) return null;
  const dest = path.join(UPLOADS_PUBLIC, 'wp-content/uploads', local);
  try {
    await fs.access(dest);
    return `/wp-content/uploads/${local}`;
  } catch {
    /* belum ada */
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return `/wp-content/uploads/${local}`;
  } catch (err) {
    console.warn(`  ! gagal unduh ${url}: ${err.message}`);
    return null;
  }
}

async function getFeaturedImageUrl(post) {
  const href = post?._links?.['wp:featuredmedia']?.[0]?.href;
  if (!href) return null;
  try {
    const media = await fetchJson(href);
    return media?.source_url ?? null;
  } catch {
    return null;
  }
}

function toIso(value) {
  return value ? new Date(value).toISOString() : undefined;
}

/**
 * Tanggal permalink WP memakai waktu LOKAL (Asia/Jakarta), bukan GMT.
 * Agar URL dated persis sama dengan permalink lama, tanggal lokal dijadikan
 * basis UTC (diberi suffix Z tanpa konversi zona).
 */
function toIsoLocal(value) {
  return value ? new Date(`${value}Z`).toISOString() : undefined;
}

async function main() {
  console.log('1/6 Mengambil kategori, tag, & penulis...');
  const [wpCategories, wpUsers, wpTags] = await Promise.all([
    fetchAll(`${WP}/wp-json/wp/v2/categories?per_page=100&orderby=count&order=desc`),
    fetchAll(`${WP}/wp-json/wp/v2/users?per_page=100`),
    fetchAll(`${WP}/wp-json/wp/v2/tags?per_page=100`),
  ]);

  const catById = new Map(wpCategories.map((c) => [c.id, c]));
  const userById = new Map(wpUsers.map((u) => [u.id, u]));
  const tagById = new Map(wpTags.map((t) => [t.id, t]));

  /** Slug kategori nested: parent/child. */
  const categoryPath = (cat) => {
    const parts = [cat.slug];
    let parent = cat.parent ? catById.get(cat.parent) : null;
    while (parent) {
      parts.unshift(parent.slug);
      parent = parent.parent ? catById.get(parent.parent) : null;
    }
    return parts.join('/');
  };

  await fs.rm(CATEGORIES_DIR, { recursive: true, force: true });
  await fs.mkdir(CATEGORIES_DIR, { recursive: true });
  await fs.rm(AUTHORS_DIR, { recursive: true, force: true });
  await fs.mkdir(AUTHORS_DIR, { recursive: true });

  for (const cat of wpCategories) {
    const json = {
      id: cat.id,
      type: 'category',
      slug: categoryPath(cat),
      title: cat.name,
      description: cat.description || '',
      ...(cat.parent ? { parentId: cat.parent } : {}),
    };
    await fs.writeFile(path.join(CATEGORIES_DIR, `${json.slug.replace(/\//g, '__')}.json`), `${JSON.stringify(json, null, 2)}\n`);
  }
  for (const user of wpUsers) {
    const json = { id: user.id, type: 'author', slug: user.slug, name: user.name, bio: strip(user.description || '') };
    await fs.writeFile(path.join(AUTHORS_DIR, `${user.slug}.json`), `${JSON.stringify(json, null, 2)}\n`);
  }

  console.log('2/6 Mengambil posts...');
  const posts = await fetchAll(`${WP}/wp-json/wp/v2/posts?per_page=100&orderby=date&order=asc&_embed=author`);
  console.log(`   ${posts.length} posts`);

  console.log('3/6 Mengambil pages...');
  const pages = await fetchAll(`${WP}/wp-json/wp/v2/pages?per_page=100&orderby=date&order=asc`);
  console.log(`   ${pages.length} pages`);

  const pageById = new Map(pages.map((p) => [p.id, p]));
  const pagePath = (page) => {
    const parts = [page.slug];
    let parent = page.parent ? pageById.get(page.parent) : null;
    while (parent) {
      parts.unshift(parent.slug);
      parent = parent.parent ? pageById.get(parent.parent) : null;
    }
    return parts.join('/');
  };

  await fs.rm(ARTICLES_DIR, { recursive: true, force: true });
  await fs.mkdir(ARTICLES_DIR, { recursive: true });
  await fs.rm(PAGES_DIR, { recursive: true, force: true });
  await fs.mkdir(PAGES_DIR, { recursive: true });

  console.log('4/6 Konversi posts → markdown...');
  let downloaded = 0;
  for (const post of posts) {
    const slug = post.slug;
    const author = post._embedded?.author?.[0];
    const cats = (post.categories || [])
      .map((id) => catById.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.id === b.id ? 0 : a.count > b.count ? -1 : 1)); // kategori terbesar dulu
    const primaryCat = cats[0] ? categoryPath(cats[0]) : undefined;
    const tags = (post.tags || [])
      .map((id) => tagById.get(id)?.name)
      .filter((name) => !!name && name.length > 1)
      .map((name) => name.replace(/\s+/g, ' ').trim());

    // relatedService: kategori utama yang cocok dengan layanan inti.
    let relatedService;
    if (primaryCat && SERVICE_ID_BY_PATH[primaryCat]) relatedService = SERVICE_ID_BY_PATH[primaryCat];

    let image = await getFeaturedImageUrl(post);
    if (image) {
      const saved = await downloadImage(image);
      image = saved ?? undefined;
      if (saved) downloaded += 1;
    }

    const body = turndown.turndown(post.content.rendered || '').replace(/\n{3,}/g, '\n\n').trim();
    const frontmatter = {
      id: post.id,
      type: 'article',
      slug,
      title: strip(post.title.rendered),
      description: makeDescription(post.excerpt?.rendered, post.content.rendered, strip(post.title.rendered)),
      pubDate: toIsoLocal(post.date),
      ...(post.modified_gmt ? { updatedDate: toIso(`${post.modified_gmt}Z`) } : {}),
      ...(author ? { author: author.name } : {}),
      ...(primaryCat ? { category: primaryCat } : {}),
      tags,
      ...(image ? { image } : {}),
      ...(relatedService ? { relatedService } : {}),
      draft: post.status !== 'publish',
    };
    await fs.writeFile(path.join(ARTICLES_DIR, `${slug}.md`), matter.stringify(body, frontmatter));
  }
  console.log(`   ${posts.length} artikel ditulis, ${downloaded} featured image diunduh`);

  console.log('5/6 Konversi pages → markdown...');
  for (const page of pages) {
    const wpPath = pagePath(page);
    const frontmatter = {
      id: page.id,
      type: 'page',
      path: wpPath,
      custom: CUSTOM_PAGES.has(wpPath),
      title: strip(page.title.rendered) || page.slug || 'Halaman',
      description: makeDescription(page.excerpt?.rendered, page.content.rendered, strip(page.title.rendered) || page.slug || 'Halaman'),
      ...(page.date_gmt ? { pubDate: toIso(`${page.date_gmt}Z`) } : {}),
      ...(page.modified_gmt ? { updatedDate: toIso(`${page.modified_gmt}Z`) } : {}),
      draft: page.status !== 'publish',
    };
    const body = turndown.turndown(page.content.rendered || '').replace(/\n{3,}/g, '\n\n').trim();
    const file = wpPath === '' ? 'home.md' : `${wpPath}.md`;
    const dest = path.join(PAGES_DIR, file);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, matter.stringify(body, frontmatter));
  }
  console.log(`   ${pages.length} halaman ditulis`);

  console.log('6/6 Selesai. Catatan:');
  console.log('   - Slug unik WP dipertahankan; URL dated dibangun dari pubDate (folder [year]/[month]/[day]).');
  console.log('   - Kategori & penulis tersimpan di src/content/{categories,authors}/.');
  console.log('   - Gambar unggahan (featured) di public/wp-content/uploads/ — mirror uploads lengkap via');
  console.log('     wget --mirror untuk gambar inline (lihat README).');
}

main().catch((err) => {
  console.error('Migrasi gagal:', err);
  process.exit(1);
});
