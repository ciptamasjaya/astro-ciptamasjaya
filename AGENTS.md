# AGENTS.md — astro-ciptamasjaya

Situs statis Astro untuk **PT. Cipta Mas Jaya** (PJK3 Riksa Uji), hasil migrasi dari WordPress `ciptamasjaya.co.id`.

## Perintah

```bash
npm run dev        # dev server (localhost:4321)
npm run build      # astro check && astro build → dist/
npm run preview    # preview dist/
npm run migrate    # tarik konten WP → src/content (jangan dijalankan ulang tanpa kebutuhan)
node scripts/mirror-uploads.mjs   # unduh gambar WP yang direferensikan konten
node scripts/verify-urls.mjs      # cek 289 URL sitemap lama tersedia di dist/ (wajib lolos)
```

## Alur kerja kolaborasi (wajib)

1. **Merge dulu, revisi belakangan**: perubahan di branch/PR milik orang lain TIDAK boleh
   ditimpa, direplace, atau dihapus. Merge dulu (tracking history tetap ada), lalu revisi
   sebagai komit terpisah di atasnya. Jangan hapus branch yang berisi kerja orang lain.
2. `astro check` (bagian dari build) wajib 0 error sebelum commit.
3. **Review menyeluruh per varian rute**: saat review/menguji perubahan, cek SETIAP varian
   halaman (post dated, halaman WP generik, custom, kategori, blog) — bukan satu sampel.
   Bug lolos karena hanya satu sampel yang diuji (kasus: dated post tak menerima koleksi
   `articles` sehingga seksi related kosong).

## Aturan mutlak (migration contract)

1. **Tidak boleh ada 404**: semua 289 URL sitemap lama (`site-urls.txt`) wajib tersedia.
   Verifikasi selalu: `node scripts/verify-urls.mjs` setelah build.
2. **URL post dated dipertahankan persis**: `/YYYY/MM/DD/<slug>/` — dibangun dari
   `pubDate` (tanggal LOKAL WP dijadikan UTC, lihat `toIsoLocal` di migrate script).
   Mengubah konversi tanggal = merusak permalink.
3. **Slug WP = id entry** (glob loader): filename markdown = slug asli WP. Jangan rename file
   konten tanpa mengubah frontmatter `slug`.
4. **Kategori nested**: slug kategori = `parent/child` (mis. `layanan/riksa-uji-boiler-2`);
   file kategori JSON pakai `__` pengganti `/` (glob loader tidak boleh nested untuk collection file? gunakan pola `layanan__x.json`).

## Struktur

```
src/
├── config.ts                  # identitas, kontak, daftar layanan (id STABIL 1–6)
├── content.config.ts          # schema zod: articles, pages, categories, authors
├── content/
│   ├── block-schema.ts        # kontrak block (adopsi csms + faq haki)
│   ├── articles/*.md          # 249 post WP (frontmatter: slug, pubDate, category…)
│   ├── pages/*.md             # 29 halaman WP (frontmatter `path` = rute)
│   ├── categories/*.json
│   └── authors/*.json
├── pages/
│   ├── index.astro            # home custom (blok csms)
│   ├── about.astro            # custom (render entry WP about)
│   ├── contact.astro          # custom (ContactPanel + LocalBusiness JSON-LD)
│   ├── my-account.astro       # custom (arahkan ke kontak — WP akun tidak relevan)
│   ├── [...path].astro        # halaman WP generik (layanan bertingkat, tanya-jawab)
│   ├── [year]/[month]/[day]/[slug].astro  # 249 post dated
│   ├── blog/…                 # arsip + pagination /blog/page/N/
│   ├── category/[...slug].astro           # 11 kategori
│   └── sitemap.xml.ts         # sitemap lengkap (311+ URL)
├── components/blocks/         # 25 block csms + FaqBlock haki + Icon
├── components/shared/         # PageShell, Header, Footer, Sidebar, Related…
└── utils/                     # structured-data (JSON-LD), related (3-tier)
public/wp-content/uploads/     # mirror gambar WP (243MB) — jangan dihapus
site-urls.txt                  # daftar URL sitemap lama (basis verifikasi no-404)
```

## Build produksi

```bash
SITE_URL=https://www.ciptamasjaya.co.id npm run build
```

Tanpa `SITE_URL`, canonical/sitemap memakai `http://astro-ciptamasjaya.lan`.

## Staging & robots.txt (PERINTAH PEMILIK — jangan dilanggar)

- **robots.txt wajib `Disallow: /` (blokir semua crawler) sampai pemilik membuka situs
  secara eksplisit.** JANGAN pernah jalankan build produksi (`SITE_URL=...co.id`) tanpa
  persetujuan eksplisit pemilik — build produksi menghasilkan `Allow: /` + Sitemap dan
  risiko situs staging terindeks.
- `dist/` saat ini HARUS hasil build STAGING (tanpa `SITE_URL` → `Disallow: /`).
  Build produksi hanya boleh dilakukan saat pemilik memerintahkan go-live secara eksplisit.
- robots.txt di-generate per-environment oleh `src/pages/robots.txt.ts` — jangan
  edit manual file hasil build; perubahan hanya lewat endpoint tersebut.
- After setiap build staging, pastikan `dist/robots.txt` = `Disallow: /`.

## Sumber konten

WordPress REST API `https://www.ciptamasjaya.co.id/wp-json/wp/v2/` (posts, pages,
categories, tags, users, media). Migrasi idempoten: `npm run migrate` menghapus dan
menulis ulang `src/content/`.

## Konvensi konten baru

- Post baru: buat `.md` di `src/content/articles/` dengan frontmatter sesuai schema
  (`id` unik, `slug`, `pubDate` ISO, `category` = slug kategori nested).
- Halaman baru: `.md` di `src/content/pages/` + frontmatter `path` (rute lengkap).
- Block opsional di frontmatter `blocks:` — daftar tipe di `src/content/block-schema.ts`.
- `astro check` (bagian dari build) wajib 0 error sebelum commit.
