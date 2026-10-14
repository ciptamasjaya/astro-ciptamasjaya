import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Sitemap lengkap: home, blog (+pagination), semua halaman WP (termasuk bertingkat),
 * post dated, dan kategori — menjamin semua URL sitemap lama tetap terindeks.
 */
type Entry = { data: { updatedDate?: Date; pubDate?: Date } };

function entryDate(e: Entry | undefined): Date | undefined {
  if (!e) return undefined;
  return e.data.updatedDate ?? e.data.pubDate;
}

function maxDate(dates: (Date | undefined)[]): Date | undefined {
  const valid = dates.filter((d): d is Date => !!d);
  if (!valid.length) return undefined;
  return new Date(Math.max(...valid.map((d) => d.valueOf())));
}

function formatDate(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const p2 = (n: number) => String(n).padStart(2, '0');

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? 'http://localhost:4321';
  const base = origin.replace(/\/$/, '');

  const [pages, articles, categories] = await Promise.all([
    getCollection('pages'),
    getCollection('articles'),
    getCollection('categories'),
  ]);

  const livePages = pages.filter((p) => !p.data.draft);
  const liveArticles = articles.filter((a) => !a.data.draft);

  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(liveArticles.length / perPage));

  type Url = { loc: string; priority: string; changefreq: string; lastmod?: string };
  const urls: Url[] = [];
  const push = (loc: string, priority: string, changefreq: string, ...sources: (Date | undefined)[]) => {
    const lastmod = maxDate(sources);
    urls.push(lastmod ? { loc, priority, changefreq, lastmod: formatDate(lastmod) } : { loc, priority, changefreq });
  };

  push(`${base}/`, '1.0', 'weekly', maxDate(liveArticles.map(entryDate)));
  push(`${base}/blog/`, '0.8', 'weekly', maxDate(liveArticles.map(entryDate)));
  for (let i = 2; i <= totalPages; i++) push(`${base}/blog/page/${i}/`, '0.5', 'weekly');

  for (const page of livePages) {
    push(`${base}/${page.data.path.replace(/^\/+|\/+$/g, '')}/`, '0.8', 'monthly', entryDate(page));
  }

  for (const article of liveArticles) {
    const { pubDate, updatedDate, slug } = article.data;
    push(
      `${base}/${pubDate.getUTCFullYear()}/${p2(pubDate.getUTCMonth() + 1)}/${p2(pubDate.getUTCDate())}/${slug}/`,
      '0.7',
      'monthly',
      updatedDate ?? pubDate,
    );
  }

  for (const category of categories) {
    const inCategory = liveArticles.filter((a) => a.data.category === category.data.slug);
    push(`${base}/category/${category.data.slug}/`, '0.6', 'monthly', maxDate(inCategory.map(entryDate)));
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => [
      '  <url>',
      `    <loc>${u.loc}</loc>`,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      ...(u.lastmod ? [`    <lastmod>${u.lastmod}</lastmod>`] : []),
      '  </url>',
    ].join('\n')),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
