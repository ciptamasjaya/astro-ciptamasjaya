# astro-ciptamasjaya

Situs statis **PT. Cipta Mas Jaya** (PJK3 Riksa Uji) — migrasi dari WordPress `ciptamasjaya.co.id` ke Astro 5 + Tailwind CSS 4.

## Ringkasan

- **Framework**: Astro 5 (SSG, content collections + glob loader)
- **Styling**: Tailwind CSS 4 (`@tailwindcss/vite`), palet `primary` via `@theme` di `src/styles/global.css`
- **Konten**: 249 post, 29 halaman, 11 kategori WP dimigrasi via REST API
- **SEO**: semua 289 URL sitemap lama dipertahankan (URL post dated `/YYYY/MM/DD/slug/`, layanan bertingkat, kategori) — `node scripts/verify-urls.mjs` = 289/289 OK
- **Structured data**: LocalBusiness, Article, BreadcrumbList, FAQPage, Service, WebSite
- **Deploy**: static `dist/` via nginx (aaPanel)

## Mulai cepat

```bash
npm ci
npm run dev                       # http://localhost:4321
SITE_URL=https://www.ciptamasjaya.co.id npm run build   # produksi → dist/
node scripts/verify-urls.mjs      # pastikan 0 URL lama 404
```

## Struktur konten

| Koleksi | Lokasi | Rute |
|---|---|---|
| Post WP | `src/content/articles/*.md` | `/YYYY/MM/DD/<slug>/` |
| Halaman WP | `src/content/pages/*.md` | sesuai frontmatter `path` |
| Kategori | `src/content/categories/*.json` | `/category/<slug>/` |
| Blog arsip | — | `/blog/`, `/blog/page/N/` |

## Script

- `scripts/migrate-wp.mjs` — tarik posts/pages/categories/tags/users WP → markdown/json (idempoten)
- `scripts/mirror-uploads.mjs` — unduh gambar WP yang direferensikan konten → `public/wp-content/uploads/`
- `scripts/verify-urls.mjs` — verifikasi semua URL sitemap lama ada di `dist/`

## Catatan penting

1. **Tanggal post**: permalink WP memakai tanggal lokal (WIB). Script migrasi menjadikan
   tanggal lokal sebagai UTC (`toIsoLocal`) agar URL dated identik dengan permalink lama.
2. **Gambar**: path `/wp-content/uploads/...` dipertahankan; file dimirror ke `public/`.
3. **Block**: adopsi 25 block `jasa-perijinan-csms` + block `faq` dari `jasa-perijinan-haki`
   (accordion tanpa JS + FAQPage JSON-LD). Kontrak di `src/content/block-schema.ts`.
4. **Layanan inti** (id 1–6, STABIL): daftar di `src/config.ts` — dipakai navigasi, footer,
   block `service-directory`, dan frontmatter `relatedService`.
5. Halaman `custom: true` (home, blog, about, contact, my-account, home-2) tidak dirender
   catch-all; masing-masing punya route khusus di `src/pages/`.

## License

MIT
