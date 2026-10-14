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

let ok = 0;
const missing = [];
for (const url of urls) {
  const rel = url.replace(/^https?:\/\/[^/]+/i, '').replace(/\/$/, '');
  const file = rel === '' ? path.join(DIST, 'index.html') : path.join(DIST, ...rel.split('/').filter(Boolean), 'index.html');
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
  process.exit(1);
}
console.log('Semua URL sitemap lama tersedia — tidak ada 404.');
