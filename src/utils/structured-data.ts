/**
 * Helper JSON-LD schema.org untuk structured data.
 *
 * Setiap fungsi mengembalikan objek siap `JSON.stringify` untuk dirender
 * sebagai <script type="application/ld+json" set:html={...} /> di <head>.
 * `baseUrl` = origin absolut (Astro.site atau Astro.url) untuk memecah
 * URL relatif konten menjadi URL absolut.
 */
import { site } from '../config';

/** Item breadcrumb; item terakhir biasanya tanpa href (halaman saat ini). */
export type BreadcrumbItem = { label: string; href?: string };

/** BreadcrumbList — untuk halaman yang merender breadcrumb. */
export function breadcrumbSchema(items: BreadcrumbItem[], baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: new URL(item.href, baseUrl).toString() } : {}),
    })),
  };
}

/** WebSite — untuk beranda. */
export function websiteSchema({ name, url, description }: { name: string; url: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
  };
}

/**
 * LocalBusiness — identitas bisnis lokal PJK3 (alamat, telepon, jam operasional,
 * koordinat). Disalin pola csms agar kaya hasil pencarian lokal.
 */
export function localBusinessSchema({ title, description, url, image }: { title: string; description: string; url: string; image?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.name,
    description,
    ...(title ? { alternateName: title } : {}),
    url,
    ...(image ? { image: new URL(image, url).toString() } : {}),
    telephone: site.phone,
    email: site.email,
    priceRange: site.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.latitude, longitude: site.geo.longitude },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: site.openingHours.days,
        opens: site.openingHours.opens,
        closes: site.openingHours.closes,
      },
    ],
  };
}

/** FAQPage — mainEntity dari pasangan tanya-jawab (block faq atau data faq layanan). */
export function faqPageSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** Article — schema artikel; author = nama penulis (fallback "Tim Redaksi"). */
export function articleSchema({
  title,
  description,
  pubDate,
  updatedDate,
  image,
  url,
  authorName,
  siteName,
  imageAlt,
  serviceArea
}: {
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  image?: string;
  url: string;
  authorName?: string;
  siteName: string;
  imageAlt?: string;
  serviceArea?: string;
}) {
  const imageObject = image ? {
    '@type': 'ImageObject',
    contentUrl: new URL(image, url).toString(),
    name: title,
    ...(imageAlt ? { caption: imageAlt } : {}),
    description: `Gambar untuk artikel ${title}`
  } : undefined;

  const localBusiness = {
    '@type': 'LocalBusiness',
    name: site.name,
    description: `Penyedia layanan riksa uji K3 di wilayah ${serviceArea}`,
    ...(image ? { image: new URL(image, url).toString() } : {}),
    telephone: site.phone,
    email: site.email,
    priceRange: site.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.latitude, longitude: site.geo.longitude },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: site.openingHours.days,
        opens: site.openingHours.opens,
        closes: site.openingHours.closes,
      },
    ],
    ...(serviceArea ? { serviceArea } : {}),
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    ...(imageObject ? { image: imageObject } : {}),
    datePublished: pubDate.toISOString(),
    dateModified: (updatedDate ?? pubDate).toISOString(),
    author: { '@type': 'Person', name: authorName || 'Tim Redaksi' },
    publisher: { '@type': 'Organization', name: siteName },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    mainEntity: localBusiness,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'serviceArea',
        value: serviceArea || 'Indonesia'
      }
    ]
  };
}

/** Service — schema layanan dengan provider = nama situs. */
export function serviceSchema({ title, description, url, siteName }: { title: string; description: string; url: string; siteName: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: title,
    description,
    url,
    provider: { '@type': 'Organization', name: siteName },
  };
}
