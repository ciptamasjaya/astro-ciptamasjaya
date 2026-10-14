import type { CollectionEntry } from 'astro:content';

function articleDate(a: CollectionEntry<'articles'>): number {
  return (a.data.updatedDate ?? a.data.pubDate).valueOf();
}

function byDateDesc(a: CollectionEntry<'articles'>, b: CollectionEntry<'articles'>): number {
  return articleDate(b) - articleDate(a);
}

/**
 * Pilih artikel terkait, maksimal `limit` item, tanpa draft dan tanpa artikel saat ini.
 * Algoritma 3-tier (dari jasa-perijinan-csms): (1) satu layanan → (2) satu kategori → (3) terbaru.
 */
export function pickRelatedArticles(
  articles: CollectionEntry<'articles'>[],
  opts: {
    currentSlug?: string;
    relatedService?: number | null;
    relatedPage?: number | null;
    category?: string | null;
    limit?: number;
  } = {},
): CollectionEntry<'articles'>[] {
  const { currentSlug, relatedService, relatedPage, category, limit = 3 } = opts;
  const pool = articles.filter((a) => !a.data.draft && a.data.slug !== currentSlug);

  const picked: CollectionEntry<'articles'>[] = [];
  const seen = new Set<string>();
  const take = (candidates: CollectionEntry<'articles'>[]) => {
    for (const a of candidates) {
      if (picked.length >= limit) return;
      if (seen.has(a.data.slug)) continue;
      seen.add(a.data.slug);
      picked.push(a);
    }
  };

  const sameService = relatedService ? pool.filter((a) => a.data.relatedService === relatedService) : [];
  const samePage = relatedPage ? pool.filter((a) => a.data.relatedPage === relatedPage) : [];
  const sameCategory = category ? pool.filter((a) => a.data.category === category) : [];
  const fallback = [...pool].sort(byDateDesc);

  take([...sameService].sort(byDateDesc));
  take([...samePage].sort(byDateDesc));
  take(sameCategory.sort(byDateDesc));
  take(fallback);

  return picked.slice(0, limit);
}

/** Entry tanggal terbaru dulu. */
export const sortByDateDesc = byDateDesc;
