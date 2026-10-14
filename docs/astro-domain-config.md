Ya, Astro bisa mengetahui domain yang sedang digunakan, tetapi untuk kebutuhan production yang benar—terutama `sitemap.xml`, canonical URL, dan gambar untuk Open Graph—saya menyarankan agar kita tidak bergantung sepenuhnya pada domain yang terdeteksi saat halaman diakses.

Dalam PRD situs Astro Anda, kita bisa membedakan domain lokal, domain preview Vercel, dan custom domain production.

## 1. Bagaimana Astro mengetahui domain?

Misalnya, situs Anda memiliki tiga alamat berikut:

Development lokal

`http://jasa-perijinan-csms.lan`

Domain yang digunakan saat menjalankan situs di komputer lokal.

Preview deployment Vercel

`https://jasa-perijinan-csms-abc123.vercel.app`

Domain sementara untuk preview atau deployment tertentu.

Production dengan custom domain

`https://published-domain.com`

Domain resmi yang seharusnya digunakan untuk SEO.

Di Astro, ada dua pendekatan:

- `Astro.url` — membaca URL request saat ini, termasuk hostname.
- `site` pada `astro.config.mjs` — menentukan URL dasar situs yang digunakan Astro untuk kebutuhan seperti sitemap dan URL absolut.

Contoh membaca domain dari request:

```
---
const hostname = Astro.url.hostname;
const protocol = Astro.url.protocol;
const origin = Astro.url.origin;
---

<p>Hostname: {hostname}</p>
<p>Origin: {origin}</p>
```

Nilai `origin` dapat berubah sesuai alamat yang digunakan untuk membuka halaman. Namun, itu tidak otomatis menjadikannya domain resmi untuk SEO.

## 2. Solusi yang saya rekomendasikan untuk PRD Anda

Pisahkan `runtime domain` dari `canonical domain`. Keduanya memiliki fungsi berbeda.

| Kebutuhan                                    | Sumber domain yang digunakan                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| Mendeteksi hostname yang sedang diakses      | `Astro.url.hostname`                                                           |
| Canonical URL SEO                            | Konfigurasi domain resmi                                                       |
| `sitemap.xml`                                | `site` pada konfigurasi Astro                                                  |
| `og:image` dan `twitter:image`               | URL absolut berdasarkan domain resmi                                           |
| URL gambar relatif dalam konten Markdown/MDX | Path aset; domain tidak perlu ditulis jika gambar di-host pada situs yang sama |
| Domain lokal `.lan`                          | Untuk development, bukan canonical production                                  |

Astro menyediakan opsi `site` khusus untuk URL deployment dan integrasi sitemap menggunakannya untuk menghasilkan URL absolut.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.astro.build\&sz=32)

Docs

+1



## 3. Contoh implementasi yang konkret

### A. Konfigurasi `astro.config.mjs`

Gunakan environment variable agar domain production tidak perlu ditulis berulang kali.

```

import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const siteUrl =
  process.env.SITE_URL ||
  "http://jasa-perijinan-csms.lan";

export default defineConfig({
  site: siteUrl,
  integrations: [sitemap()],
});

```

### B. Environment untuk masing-masing lingkungan

Development lokal, misalnya `.env.development`:

```
SITE_URL=http://jasa-perijinan-csms.lan
```

Production Vercel, atur environment variable di pengaturan proyek Vercel:

```
SITE_URL=https://published-domain.com
```

Astro membaca `SITE_URL` saat konfigurasi dijalankan. Karena konfigurasi ini menentukan URL dasar untuk sitemap, nilainya harus sesuai dengan lingkungan build.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://v6.docs.astro.build\&sz=32)

Docs

+1



Catatan: jika Anda menggunakan URL preview Vercel, jangan otomatis menganggap URL preview itu sebagai canonical production.

### C. Membuat canonical URL dan Open Graph image

Di komponen layout atau SEO Anda:

```

---
const canonicalUrl = new URL(
  Astro.url.pathname,
  Astro.site
);

const ogImageUrl = new URL(
  "/images/og-default.jpg",
  Astro.site
);
---

<link rel="canonical" href={canonicalUrl.href} />

<meta property="og:image" content={ogImageUrl.href} />
<meta name="twitter:image" content={ogImageUrl.href} />

```

Dengan pendekatan ini, ketika situs diakses melalui domain preview, canonical tetap mengarah ke domain production yang telah dikonfigurasi.

Misalnya, URL halaman saat ini:

`https://jasa-perijinan-csms-abc123.vercel.app/layanan/csms`

Canonical URL yang dihasilkan:

`https://published-domain.com/layanan/csms`

Sedangkan URL gambar:

`https://published-domain.com/images/og-default.jpg`

Pastikan gambar tersebut memang tersedia di lokasi yang dituju.

## 4. Bagaimana dengan sitemap.xml?

Setelah integrasi sitemap dipasang, Astro dapat menghasilkan file sitemap saat proses build.

Contoh URL production:

`https://published-domain.com/sitemap-index.xml`

Isinya akan menunjuk ke sitemap yang memuat URL halaman menggunakan domain yang dikonfigurasi. Untuk situs yang tidak terlalu besar, mekanisme ini biasanya sudah memadai.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://v6.docs.astro.build\&sz=32)

Docs



Perlu diperhatikan bahwa untuk situs statis, sitemap umumnya dibuat saat build, bukan berubah otomatis berdasarkan hostname setiap request. Jadi, mengakses deployment yang sama melalui domain lain tidak otomatis mengganti isi sitemap.

## 5. Keputusan yang perlu dimasukkan ke PRD

Saya menyarankan ketentuan berikut untuk PRD situs Astro Anda:

- Domain runtime: Astro boleh membaca hostname aktif melalui `Astro.url`.
- Domain resmi SEO: ditetapkan melalui `SITE_URL` dan konfigurasi `site`.
- Canonical URL: selalu menggunakan domain resmi, bukan hostname request.
- Sitemap: dihasilkan berdasarkan domain resmi pada saat build.
- Open Graph: seluruh URL gambar yang membutuhkan URL absolut menggunakan domain resmi.
- Local development: boleh menggunakan domain `.lan`, tanpa menjadikannya domain canonical production.
- Preview deployment: tidak boleh mencemari metadata SEO production dengan URL preview.
- Perubahan domain production: memperbarui `SITE_URL` dan menjalankan build/deployment ulang.

Satu hal penting: bila nanti Anda menginginkan satu hasil build statis yang sama berjalan di `.lan`, preview Vercel, dan custom domain tanpa rebuild, kita perlu merancang strategi runtime tersendiri. `Astro.url` dapat membantu membaca hostname pada halaman yang dirender saat request, tetapi tidak dapat mengubah HTML statis dan sitemap yang sudah dibuat sebelumnya.

Untuk arsitektur PRD saat ini, pilihan paling aman adalah menggunakan domain resmi yang eksplisit untuk SEO, sambil tetap mengizinkan Astro mendeteksi domain aktif untuk fungsi runtime lainnya.
