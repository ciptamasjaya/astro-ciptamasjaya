#!/usr/bin/env node
/**
 * Mirror gambar unggahan WP yang direferensikan konten markdown ke public/.
 * Hanya mengunduh URL /wp-content/uploads/... yang benar-benar dipakai
 * (featured image + gambar inline), bukan seluruh folder uploads.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WP = 'https://www.ciptamasjaya.co.id';
const CONTENT_DIRS = [path.join(ROOT, 'src/content/articles'), path.join(ROOT, 'src/content/pages')];
const PUBLIC_DIR = path.join(ROOT, 'public');

async function walk(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return (await Promise.all(entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : [])))).flat();
  } catch {
    return [];
  }
}

const files = (await Promise.all(CONTENT_DIRS.map(walk))).flat();
const urls = new Set();
for (const file of files) {
  const text = await fs.readFile(file, 'utf8');
  for (const m of text.matchAll(/(?:\(|\s|"|')\/wp-content\/uploads\/([^)\s"']+)/g)) {
    urls.add(m[1].replace(/[),]+$/, ''));
  }
}
console.log(`${urls.size} URL unggahan unik ditemukan`);

let ok = 0;
let skip = 0;
let fail = 0;
const failed = [];
for (const rel of [...urls]) {
  const dest = path.join(PUBLIC_DIR, 'wp-content/uploads', rel);
  try {
    await fs.access(dest);
    skip += 1;
    continue;
  } catch {
    /* unduh */
  }
  try {
    const res = await fetch(`${WP}/wp-content/uploads/${rel}`);
    if (!res.ok) throw new Error(String(res.status));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    ok += 1;
  } catch (err) {
    fail += 1;
    failed.push(`${rel} (${err.message})`);
  }
}
console.log(`diunduh: ${ok}, sudah ada: ${skip}, gagal: ${fail}`);
if (failed.length) {
  await fs.writeFile(path.join(ROOT, 'mirror-failures.txt'), failed.join('\n') + '\n');
  console.log('daftar gagal → mirror-failures.txt');
}
