#!/usr/bin/env node
/**
 * Batch SEO restore untuk 244 artikel sisa.
 * Fetch HTML WP asli → extract Rank Math meta description + og:image:alt
 * → update frontmatter article.
 *
 * Usage: node batch-seo-articles.mjs [--dry-run] [--batch-size=25] [--start=0]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = '/www/wwwroot/astro-ciptamasjaya';
const ARTICLES_DIR = path.join(ROOT, 'src/content/articles');
const WP_BASE = 'https://www.ciptamasjaya.co.id';

// 5 artikel yang sudah selesai
const DONE_SLUGS = new Set([
  'apa-itu-scissor-lift',
  'apa-saja-jenis-inspeksi-k3',
  'dasar-hukum-pengesahan-gambar-bejana-tekan-dan-tangki-timbun',
  'jasa-inspeksi-alarm-kebakaran',
  'penetrant-testing',
]);

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '25', 10);
const startIdx = parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '0', 10);

function extractMetaDescription(html) {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  return m ? m[1] : null;
}

function extractOgImageAlt(html) {
  const m = html.match(/<meta\s+property="og:image:alt"\s+content="([^"]*)"/i);
  return m ? m[1] : null;
}

function slugToWpUrl(slug) {
  // Articles use dated URL: need to get pubDate from frontmatter first
  return null; // Will be constructed per-file
}

async function fetchWpHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (SEO Batch Restore)' },
      timeout: 15000,
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { html: await res.text() };
  } catch (e) {
    return { error: e.message };
  }
}

async function processArticle(file, idx) {
  const filePath = path.join(ARTICLES_DIR, file);
  const content = await fs.readFile(filePath, 'utf8');
  const { data: frontmatter, content: body } = matter(content);

  // Skip if already done
  if (DONE_SLUGS.has(frontmatter.slug)) {
    return { file, slug: frontmatter.slug, skipped: 'already-done' };
  }

  // Construct WP URL from dated pattern
  const pubDate = new Date(frontmatter.pubDate);
  const year = pubDate.getUTCFullYear();
  const month = String(pubDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pubDate.getUTCDate()).padStart(2, '0');
  const wpUrl = `${WP_BASE}/${year}/${month}/${day}/${frontmatter.slug}/`;

  const { html, error } = await fetchWpHtml(wpUrl);
  if (error) {
    return { file, slug: frontmatter.slug, error: `Fetch failed: ${error}` };
  }

  const wpDesc = extractMetaDescription(html);
  const wpImgAlt = extractOgImageAlt(html);

  const needsDescUpdate = wpDesc && frontmatter.description !== wpDesc;
  const needsAltUpdate = wpImgAlt && frontmatter.imageAlt !== wpImgAlt;

  if (!needsDescUpdate && !needsAltUpdate) {
    return { file, slug: frontmatter.slug, skipped: 'already-matches' };
  }

  // Update frontmatter
  let newFrontmatter = { ...frontmatter };
  if (needsDescUpdate) newFrontmatter.description = wpDesc;
  if (needsAltUpdate) newFrontmatter.imageAlt = wpImgAlt;

  const newContent = matter.stringify(body, newFrontmatter);

  if (!dryRun) {
    await fs.writeFile(filePath, newContent, 'utf8');
  }

  return {
    file,
    slug: frontmatter.slug,
    updated: true,
    changes: {
      description: needsDescUpdate,
      imageAlt: needsAltUpdate,
    },
    wpDesc: wpDesc?.substring(0, 80),
    wpImgAlt: wpImgAlt?.substring(0, 80),
  };
}

async function main() {
  console.log(`=== Batch SEO Articles Restore ===`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Start index: ${startIdx}\n`);

  const files = (await fs.readdir(ARTICLES_DIR))
    .filter(f => f.endsWith('.md'))
    .sort();

  const batchFiles = files.slice(startIdx, startIdx + batchSize);
  console.log(`Processing ${batchFiles.length} articles (${startIdx + 1}-${startIdx + batchFiles.length} of ${files.length})\n`);

  const results = [];
  for (let i = 0; i < batchFiles.length; i++) {
    const file = batchFiles[i];
    const globalIdx = startIdx + i + 1;
    console.log(`[${globalIdx}/${files.length}] ${file}...`);
    const result = await processArticle(file, i);
    results.push(result);

    if (result.error) {
      console.log(`  ✗ Error: ${result.error}`);
    } else if (result.skipped) {
      console.log(`  ⊘ Skipped: ${result.skipped}`);
    } else if (result.updated) {
      console.log(`  ✓ Updated: desc=${result.changes.description}, alt=${result.changes.imageAlt}`);
      if (result.wpDesc) console.log(`    desc: "${result.wpDesc}..."`);
      if (result.wpImgAlt) console.log(`    alt: "${result.wpImgAlt}..."`);
    }
  }

  // Summary
  const updated = results.filter(r => r.updated).length;
  const skipped = results.filter(r => r.skipped).length;
  const errors = results.filter(r => r.error).length;

  console.log(`\n=== Batch Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (errors > 0) {
    console.log('\nErrors:');
    results.filter(r => r.error).forEach(r => console.log(`  ${r.file}: ${r.error}`));
  }

  // Save report
  const reportPath = `/tmp/opencode/batch-report-${Date.now()}.json`;
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nReport saved: ${reportPath}`);

  return { updated, skipped, errors, total: results.length };
}

main().catch(console.error);