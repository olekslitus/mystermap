#!/usr/bin/env node
// Fails CI if any image referenced from an entity lacks an attribution.txt
// in its public/entities/<slug>/ directory.
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const entitiesDir = resolve(root, 'src/content/entities');
const publicEntitiesDir = resolve(root, 'public/entities');

const errors = [];
const warnings = [];

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

function extractFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return parseYaml(match[1]);
  } catch (e) {
    return { __error: e.message };
  }
}

const files = await readdir(entitiesDir);
let checked = 0;
for (const file of files) {
  if (file.startsWith('_') || !file.endsWith('.md')) continue;
  const slug = file.replace(/\.md$/, '');
  const text = await readFile(resolve(entitiesDir, file), 'utf-8');
  const fm = extractFrontmatter(text);
  if (!fm) {
    errors.push(`${file}: no frontmatter`);
    continue;
  }
  if (fm.__error) {
    errors.push(`${file}: invalid frontmatter — ${fm.__error}`);
    continue;
  }
  const images = fm.images ?? [];
  if (images.length === 0) {
    warnings.push(`${file}: no images yet (acceptable, but please add one)`);
    continue;
  }
  checked++;
  const attrPath = resolve(publicEntitiesDir, slug, 'attribution.txt');
  if (!(await exists(attrPath))) {
    errors.push(`${file}: missing public/entities/${slug}/attribution.txt`);
    continue;
  }
  const attr = await readFile(attrPath, 'utf-8');
  for (const img of images) {
    if (!img.credit) {
      errors.push(`${file}: image ${img.src} has no \`credit\` field`);
    }
    const filename = img.src.split('/').pop();
    if (filename && !attr.includes(filename)) {
      errors.push(`${file}: attribution.txt does not mention ${filename}`);
    }
  }
}

if (warnings.length > 0) {
  console.warn('\nWARNINGS:');
  for (const w of warnings) console.warn('  ' + w);
}

if (errors.length > 0) {
  console.error('\nERRORS:');
  for (const e of errors) console.error('  ' + e);
  console.error(`\n${errors.length} attribution problem(s) found.`);
  process.exit(1);
}

console.log(`\nAttribution OK. ${checked} ${checked === 1 ? 'entity' : 'entities'} with images checked.`);
