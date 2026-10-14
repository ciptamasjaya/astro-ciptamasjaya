import type { APIRoute } from 'astro';

/**
 * robots.txt per-environment (dibangun saat build, bukan per-branch):
 * - Produksi (SITE_URL = https://www.ciptamasjaya.co.id): Allow + Sitemap.
 * - Staging/lokal lain: Disallow: / agar Google tidak mengindeks environment
 *   pra-golive (melindungi ranking domain produksi).
 */
const SITE_URL = (process.env.SITE_URL || 'http://astro-ciptamasjaya.lan').replace(/\/$/, '');
const isProduction = SITE_URL === 'https://www.ciptamasjaya.co.id';

const body = isProduction
  ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n')
  : 'User-agent: *\nDisallow: /\n';

export const GET: APIRoute = async () =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
