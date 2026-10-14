#!/usr/bin/env node
/**
 * Verifikasi mutlak: semua URL sitemap lama HARUS tersedia di dist/ (tidak 404).
 * Pemetaan URL → file statis:
 *   /                     → dist/index.html
 *   /a/b/                 → dist/a/b/index.html
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const URLS_FILE = process.argv[2] || path.join(ROOT, 'site-urls.txt');

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return (await Promise.all(entries.map((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() ? [full] : [];
  }))).flat();
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const raw = await fs.readFile(URLS_FILE, 'utf8');
const urls = [...new Set(raw.trim().split('\n').map((l) => l.trim()).filter(Boolean))];
console.log(`Memeriksa ${urls.length} URL sitemap lama...`);

function pathnameOf(value) {
  try {
    return decodeURIComponent(new URL(value, 'http://localhost').pathname).replace(/\/$/, '') || '/';
  } catch {
    throw new Error(`URL tidak valid di ${URLS_FILE}: ${value}`);
  }
}

let ok = 0;
const missing = [];
for (const url of urls) {
  const rel = pathnameOf(url).replace(/^\//, '');
  const file = rel === '' ? path.join(DIST, 'index.html') : path.join(DIST, ...rel.split('/'), 'index.html');
  if (await exists(file)) {
    ok += 1;
  } else {
    missing.push(url);
  }
}

console.log(`OK: ${ok}/${urls.length}`);
if (missing.length) {
  console.log(`MISSING (${missing.length}):`);
  for (const url of missing) console.log('  ' + url);
  await fs.writeFile(path.join(ROOT, 'verify-missing.txt'), missing.join('\n') + '\n');
  process.exitCode = 1;
} else {
  console.log('Semua URL sitemap lama tersedia — tidak ada 404.');
}

// Pastikan setiap URL lama juga tercantum dalam sitemap hasil build.
// Bandingkan pathname saja agar build staging dan produksi dapat diverifikasi.
const sitemapPath = path.join(DIST, 'sitemap.xml');
if (!(await exists(sitemapPath))) {
  console.error('MISSING: dist/sitemap.xml tidak ditemukan.');
  process.exitCode = 1;
} else {
  const sitemap = await fs.readFile(sitemapPath, 'utf8');
  const sitemapPaths = new Set(
    [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => pathnameOf(match[1].trim())),
  );
  const absentFromSitemap = urls.filter((url) => !sitemapPaths.has(pathnameOf(url)));
  console.log(`URL lama tercantum di sitemap: ${urls.length - absentFromSitemap.length}/${urls.length}`);
  if (absentFromSitemap.length) {
    console.error(`ABSENT FROM SITEMAP (${absentFromSitemap.length}):`);
    for (const url of absentFromSitemap) console.error('  ' + url);
    process.exitCode = 1;
  }
}

// Audit gambar lokal yang dipakai halaman hasil build, bukan hanya URL halaman.
const htmlFiles = (await walk(DIST)).filter((file) => file.endsWith('.html'));
const missingImages = [];
let checkedImages = 0;
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  const refs = new Set();
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*\b(?:src|data-src)=["']([^"']+)["']/gi)) refs.add(match[1]);
  for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of match[1].split(',')) refs.add(candidate.trim().split(/\s+/)[0]);
  }
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/gi)) refs.add(match[1]);

  for (const ref of refs) {
    const value = ref.trim().replace(/&amp;/g, '&');
    if (!value || value.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
    let pathname;
    try {
      pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    } catch {
      missingImages.push(`${path.relative(DIST, file)} -> invalid encoded URL: ${value}`);
      continue;
    }
    if (!/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(pathname)) continue;
    if (!pathname.startsWith('/')) pathname = `/${pathname}`;
    checkedImages += 1;
    const target = path.join(DIST, ...pathname.split('/').filter(Boolean));
    if (!(await exists(target))) missingImages.push(`${path.relative(DIST, file)} -> ${ref}`);
  }
}

console.log(`Gambar lokal diperiksa: ${checkedImages}`);
console.log(`Gambar hilang: ${missingImages.length}`);
if (missingImages.length) {
  console.error(missingImages.map((item) => `  MISSING ${item}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Semua gambar lokal yang direferensikan HTML tersedia.');
}
