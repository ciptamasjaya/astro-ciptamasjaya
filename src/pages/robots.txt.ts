import type { APIRoute } from 'astro';
import { resolveSiteUrl, isProductionSiteUrl } from '../utils/site-url';

/**
 * robots.txt per-environment (dibangun saat build, bukan per-branch):
 * - Produksi (site = https://www.ciptamasjaya.co.id): Allow + Sitemap.
 * - Staging/lokal/Vercel lain: Disallow: / agar Google tidak mengindeks environment
 *   pra-golive (melindungi ranking domain produksi).
 */
const SITE_URL = resolveSiteUrl();
const isProduction = isProductionSiteUrl(SITE_URL);

const body = isProduction
  ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n')
  : 'User-agent: *\nDisallow: /\n';

export const GET: APIRoute = async () =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
