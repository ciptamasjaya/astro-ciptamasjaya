/**
 * Resolusi URL situs per lingkungan (dipakai astro.config + robots.txt):
 * 1. `SITE_URL` eksplisit (menang — dipakai untuk produksi saat go-live).
 * 2. Vercel: `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` (otomatis dari
 *    setiap deployment Vercel, tanpa setting manual).
 * 3. Fallback lokal `http://astro-ciptamasjaya.lan`.
 * Produksi TERKUNCI: `SITE_URL=https://www.ciptamasjaya.co.id` hanya saat pemilik go-live.
 */
const PRODUCTION_URL = 'https://www.ciptamasjaya.co.id';
const LOCAL_URL = 'http://astro-ciptamasjaya.lan';

export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, '');
  const vercelDomain = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  if (vercelDomain) return `https://${vercelDomain.replace(/\/$/, '')}`;
  return LOCAL_URL;
}

export const isProductionSiteUrl = (url: string): boolean => url.replace(/\/$/, '') === PRODUCTION_URL;
