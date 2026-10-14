#!/usr/bin/env node
/**
 * Verifikasi hasil build:
 * - Semua URL WordPress dalam site-urls.txt harus memiliki HTML di dist/.
 * - Semua URL lama harus tercantum dalam dist/sitemap.xml.
 * - Semua gambar lokal yang direferensikan HTML harus tersedia di dist/.
 * - Dengan --check-remote, URL gambar HTTP(S) eksternal juga diuji.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const URLS_FILE = path.resolve(args.find((arg) => !arg.startsWith('--')) || path.join(ROOT, 'site-urls.txt'));
const CHECK_REMOTE = args.includes('--check-remote');

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

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

const raw = await fs.readFile(URLS_FILE, 'utf8');
const urls = [...new Set(raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
console.log(`Memeriksa ${urls.length} URL lama dari ${path.relative(ROOT, URLS_FILE) || URLS_FILE}...`);

function pathnameOf(value) {
  try {
    return decodeURIComponent(new URL(value, 'http://audit.invalid').pathname).replace(/\/$/, '') || '/';
  } catch {
    throw new Error(`URL tidak valid di ${URLS_FILE}: ${value}`);
  }
}

let ok = 0;
const missing = [];
for (const url of urls) {
  const rel = pathnameOf(url).replace(/^\/+/, '');
  const file = rel === '' ? path.join(DIST, 'index.html') : path.join(DIST, ...rel.split('/'), 'index.html');
  if (await exists(file)) {
    ok += 1;
  } else {
    missing.push(url);
  }
}

console.log(`URL tersedia di dist: ${ok}/${urls.length}`);
if (missing.length) {
  console.error(`URL HILANG (${missing.length}):\n${missing.map((url) => `  ${url}`).join('\n')}`);
  await fs.writeFile(path.join(ROOT, 'verify-missing.txt'), missing.join('\n') + '\n');
  process.exitCode = 1;
} else {
  console.log('Semua URL lama memiliki file HTML hasil build.');
}

const sitemapPath = path.join(DIST, 'sitemap.xml');
if (!(await exists(sitemapPath))) {
  console.error('SITEMAP HILANG: dist/sitemap.xml tidak ditemukan.');
  process.exitCode = 1;
} else {
  const sitemap = await fs.readFile(sitemapPath, 'utf8');
  const sitemapPaths = new Set(
    [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => pathnameOf(match[1].trim())),
  );
  const absentFromSitemap = urls.filter((url) => !sitemapPaths.has(pathnameOf(url)));
  console.log(`URL lama tercantum di sitemap: ${urls.length - absentFromSitemap.length}/${urls.length}`);
  if (absentFromSitemap.length) {
    console.error(`URL TIDAK ADA DI SITEMAP (${absentFromSitemap.length}):\n${absentFromSitemap.map((url) => `  ${url}`).join('\n')}`);
    process.exitCode = 1;
  }
}

const htmlFiles = (await walk(DIST)).filter((file) => file.endsWith('.html'));
const missingImages = [];
const remoteImages = new Set();
let checkedLocalImages = 0;

function isImagePath(pathname) {
  return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(pathname);
}

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
    if (!value || value.startsWith('#') || /^(?:data:|blob:|javascript:)/i.test(value)) continue;
    let resolved;
    try {
      const htmlDir = path.relative(DIST, path.dirname(file)).split(path.sep).join('/');
      resolved = new URL(value, `https://audit.invalid/${htmlDir ? `${htmlDir}/` : ''}`);
    } catch {
      missingImages.push(`${path.relative(DIST, file)} -> URL gambar tidak valid: ${value}`);
      continue;
    }
    if (!isImagePath(resolved.pathname)) continue;

    if (resolved.origin !== 'https://audit.invalid') {
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') remoteImages.add(resolved.href);
      continue;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(resolved.pathname);
    } catch {
      missingImages.push(`${path.relative(DIST, file)} -> URL gambar dengan encoding tidak valid: ${value}`);
      continue;
    }
    const target = path.resolve(DIST, ...pathname.split('/').filter(Boolean));
    if (target !== DIST && !target.startsWith(DIST + path.sep)) {
      missingImages.push(`${path.relative(DIST, file)} -> path gambar keluar dari dist: ${value}`);
      continue;
    }
    checkedLocalImages += 1;
    if (!(await exists(target))) missingImages.push(`${path.relative(DIST, file)} -> ${value}`);
  }
}

console.log(`File HTML dipindai: ${htmlFiles.length}`);
console.log(`Gambar lokal diperiksa: ${checkedLocalImages}`);
console.log(`Gambar lokal hilang: ${missingImages.length}`);
if (missingImages.length) {
  console.error(missingImages.map((item) => `  HILANG ${item}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Semua gambar lokal yang direferensikan HTML tersedia.');
}

console.log(`URL gambar eksternal unik ditemukan: ${remoteImages.size}`);
if (CHECK_REMOTE) {
  const remoteFailures = [];
  for (const url of remoteImages) {
    try {
      let response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 403 || response.status === 405 || response.status === 501) {
        response = await fetch(url, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });
        if (response.body) await response.body.cancel();
      }
      if (!response.ok) remoteFailures.push(`${response.status} ${url}`);
    } catch (error) {
      remoteFailures.push(`GAGAL DIJANGKAU ${url} (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  console.log(`Gambar eksternal lolos: ${remoteImages.size - remoteFailures.length}/${remoteImages.size}`);
  if (remoteFailures.length) {
    console.error(`GAMBAR EKSTERNAL BERMASALAH (${remoteFailures.length}):\n${remoteFailures.map((item) => `  ${item}`).join('\n')}`);
    process.exitCode = 1;
  }
} else if (remoteImages.size) {
  console.warn('Gambar eksternal belum diuji jaringan. Jalankan: npm run verify -- --check-remote');
}
