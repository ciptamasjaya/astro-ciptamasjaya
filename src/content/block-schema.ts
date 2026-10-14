import { z } from 'astro:content';
import { serviceIds } from '../config';

/**
 * Shared contract for content-driven Astro blocks (diadopsi dari jasa-perijinan-csms,
 * disesuaikan untuk ciptamasjaya: tanpa referensi elemen CSMS, plus block `faq`).
 */
const legacyContentBlockSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    type: z.literal('article-body'),
    data: z.object({
      introParagraphs: z.array(z.string().min(1)).min(1),
      sections: z.array(z.object({
        title: z.string().min(1),
        intro: z.string().optional(),
        subsections: z.array(z.object({
          title: z.string().min(1),
          paragraphs: z.array(z.string().min(1)).min(1),
        })).default([]),
      })).min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('contact-panel'),
    data: z.object({
      title: z.string().min(1),
      intro: z.string().min(1),
      contacts: z.array(z.object({
        label: z.string().min(1),
        phone: z.string().min(1),
        display: z.string().min(1),
      })).min(1),
      hoursTitle: z.string().min(1),
      hours: z.array(z.string().min(1)).min(1),
      formTitle: z.string().min(1),
      serviceOptions: z.array(z.string().min(1)).min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('content-section'),
    data: z.object({
      title: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
      variant: z.enum(['plain', 'muted', 'primary']).optional(),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('feature-card-grid'),
    data: z.object({
      title: z.string().min(1),
      columns: z.union([z.literal(2), z.literal(3)]),
      items: z.array(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        points: z.array(z.string().min(1)).optional(),
        href: z.string().startsWith('/').optional(),
      })).min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('latest-articles'),
    data: z.object({
      title: z.string().min(1),
      limit: z.number().int().positive().max(6),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('image-panel'),
    data: z.object({
      src: z.string().startsWith('/'),
      alt: z.string().min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('hero'),
    data: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      primaryLabel: z.string().min(1),
      primaryHref: z.string().min(1),
      secondaryLabel: z.string().min(1),
      secondaryHref: z.string().min(1),
      secondaryIsWhatsApp: z.boolean().optional(),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('service-directory'),
    data: z.object({
      title: z.string().min(1),
      intro: z.string().min(1),
      imageSrc: z.string().startsWith('/'),
      imageAlt: z.string().min(1),
      serviceIds: z.array(z.number().int().positive().refine((id) => serviceIds.includes(id), {
        message: 'serviceIds harus merujuk ke layanan di src/config.ts',
      })).min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('service-card-grid'),
    data: z.object({
      title: z.string().min(1),
      intro: z.string().optional(),
      items: z.array(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        audience: z.string().min(1),
        href: z.string().startsWith('/'),
        image: z.string().startsWith('/').optional(),
        imageAlt: z.string().optional(),
        number: z.string().optional(),
      })).min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('image-gallery'),
    data: z.object({
      title: z.string().min(1).optional(),
      intro: z.string().optional(),
      layout: z.enum(['editorial', 'grid']).optional(),
      items: z.array(z.object({
        src: z.string().startsWith('/'),
        alt: z.string().min(1),
        title: z.string().optional(),
        caption: z.string().optional(),
      })).min(2),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('stats-grid'),
    data: z.object({
      items: z.array(z.object({
        value: z.string().min(1),
        label: z.string().min(1),
      })).min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('quick-answer'),
    data: z.object({
      title: z.string().min(1),
      answer: z.string().min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('process-timeline'),
    data: z.object({
      title: z.string().min(1),
      steps: z.array(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      })).min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('testimonial-grid'),
    data: z.object({
      title: z.string().min(1),
      items: z.array(z.object({
        quote: z.string().min(1),
        name: z.string().min(1),
        industry: z.string().min(1),
      })).min(1),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('call-to-action'),
    data: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      primaryLabel: z.string().min(1),
      primaryHref: z.string().min(1),
      secondaryLabel: z.string().min(1),
      secondaryHref: z.string().min(1),
      secondaryIsWhatsApp: z.boolean().optional(),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('requirement-checklist'),
    data: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      items: z.array(z.object({
        label: z.string().min(1),
        required: z.boolean().optional(),
      })).min(1),
      disclaimer: z.string().optional(),
    }),
  }),

  z.object({ id: z.string().min(1), type: z.literal('article-hero'), data: z.object({ eyebrow: z.string().optional(), title: z.string().min(1), description: z.string().min(1), image: z.string().startsWith('/').optional(), imageAlt: z.string().optional() }) }),
  z.object({ id: z.string().min(1), type: z.literal('article-lead'), data: z.object({ text: z.string().min(1), label: z.string().optional() }) }),
  z.object({ id: z.string().min(1), type: z.literal('section-header'), data: z.object({ title: z.string().min(1), eyebrow: z.string().optional(), number: z.number().int().positive().optional(), description: z.string().optional() }) }),
  z.object({ id: z.string().min(1), type: z.literal('content-card'), data: z.object({ title: z.string().min(1), description: z.string().optional(), items: z.array(z.string().min(1)).optional(), variant: z.enum(['blue', 'slate', 'white']).optional() }) }),
  z.object({ id: z.string().min(1), type: z.literal('numbered-steps'), data: z.object({ title: z.string().min(1), intro: z.string().optional(), steps: z.array(z.object({ title: z.string().min(1), description: z.string().min(1) })).min(1) }) }),
  z.object({ id: z.string().min(1), type: z.literal('checklist-card'), data: z.object({ title: z.string().min(1), description: z.string().optional(), items: z.array(z.object({ label: z.string().min(1), detail: z.string().optional(), required: z.boolean().optional() })).min(1), note: z.string().optional() }) }),
  z.object({ id: z.string().min(1), type: z.literal('document-list'), data: z.object({ title: z.string().min(1), intro: z.string().optional(), items: z.array(z.object({ name: z.string().min(1), purpose: z.string().optional(), mandatory: z.boolean().optional() })).min(1) }) }),
  z.object({ id: z.string().min(1), type: z.literal('comparison-table'), data: z.object({ title: z.string().min(1), intro: z.string().optional(), headers: z.array(z.string().min(1)).min(2), rows: z.array(z.array(z.string().min(1)).min(2)).min(1), note: z.string().optional() }) }),
  z.object({ id: z.string().min(1), type: z.literal('info-callout'), data: z.object({ title: z.string().min(1), text: z.string().min(1), variant: z.enum(['info', 'warning', 'success']).optional() }) }),
  z.object({ id: z.string().min(1), type: z.literal('service-cta'), data: z.object({ title: z.string().min(1), description: z.string().min(1), label: z.string().min(1), href: z.string().min(1), note: z.string().optional() }) }),

  // Block dari pola haki: accordion FAQ (tanpa JavaScript) + FAQPage JSON-LD.
  z.object({
    id: z.string().min(1),
    type: z.literal('faq'),
    data: z.object({
      heading: z.string().min(1),
      icon: z.string().optional(),
      class: z.record(z.string(), z.string()).optional(),
      items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
    }),
  }),
]);

/**
 * Frontmatter accepts both the current `{ id, type, data }` contract and the
 * component-first contract used by the site's Astro components:
 *
 * blocks:
 *   - component: faq
 *     id: frequently-asked
 *     heading: ...
 *     items: [...]
 *
 * Normalize component-first entries at the content boundary so rendering and
 * structured-data generation continue to use one validated internal shape.
 * Unknown component names still fail the existing discriminated-union schema.
 */
export const contentBlockSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;

  const block = input as Record<string, unknown>;
  if (typeof block.component !== 'string' || 'type' in block) return input;

  const { component, id, ...props } = block;
  return { id, type: component, data: props };
}, legacyContentBlockSchema);

export type ContentBlock = z.infer<typeof contentBlockSchema>;
