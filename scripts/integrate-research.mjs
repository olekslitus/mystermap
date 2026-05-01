#!/usr/bin/env node
// Integrate the JSON output of the research agents into entity .md files.
// Reads:
//   .research-sightings.json     { <slug>: { sightings, extraSources } }
//   .research-new-entities.json  { <slug>: { name, faction, tagline, body, ... } }
//   .research-images.json        { <slug>: { url, license, author, alt } }
// Writes:
//   src/content/entities/<slug>.md (updated for existing, created for new)
//   src/data/territories/<slug>.geojson (created for new entities only — placeholder polygon)
//   public/entities/<slug>/attribution.txt (when an image is set)

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function readJsonOptional(path) {
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

const sightings = (await readJsonOptional(resolve(root, '.research-sightings.json'))) ?? {};
const newEntities = (await readJsonOptional(resolve(root, '.research-new-entities.json'))) ?? {};
const images = (await readJsonOptional(resolve(root, '.research-images.json'))) ?? {};

console.log(`Sightings: ${Object.keys(sightings).length} entities`);
console.log(`New entities: ${Object.keys(newEntities).length} entities`);
console.log(`Images: ${Object.keys(images).length} entries`);

function quoteYaml(s) {
  return JSON.stringify(s);
}

function formatSighting(s, indent) {
  const pad = ' '.repeat(indent);
  const lines = [
    `${pad}- lat: ${s.lat}`,
    `${pad}  lon: ${s.lon}`,
    `${pad}  year: ${s.year ?? 'null'}`,
  ];
  if (s.date) lines.push(`${pad}  date: ${quoteYaml(s.date)}`);
  lines.push(`${pad}  location: ${quoteYaml(s.location)}`);
  lines.push(`${pad}  description: ${quoteYaml(s.description)}`);
  lines.push(`${pad}  sourceType: ${s.sourceType}`);
  lines.push(`${pad}  sourceUrl: ${quoteYaml(s.sourceUrl)}`);
  lines.push(`${pad}  sourceTitle: ${quoteYaml(s.sourceTitle)}`);
  return lines.join('\n');
}

function formatSightings(arr) {
  if (!arr || arr.length === 0) return 'sightings: []';
  return 'sightings:\n' + arr.map((s) => formatSighting(s, 2)).join('\n');
}

function formatSources(arr) {
  return arr
    .map((s) => `  - url: ${quoteYaml(s.url)}\n    title: ${quoteYaml(s.title)}`)
    .join('\n');
}

function formatImages(arr) {
  if (!arr || arr.length === 0) return 'images: []';
  return (
    'images:\n' +
    arr
      .map((i) => {
        const lines = [
          `  - src: ${quoteYaml(i.src)}`,
          `    alt: ${quoteYaml(i.alt)}`,
          `    credit: ${quoteYaml(i.credit)}`,
        ];
        if (i.creditUrl) lines.push(`    creditUrl: ${quoteYaml(i.creditUrl)}`);
        return lines.join('\n');
      })
      .join('\n')
  );
}

// ─── Update existing entity files ──────────────────────────────────────
const updated = [];
const entriesDir = resolve(root, 'src/content/entities');
for (const [slug, data] of Object.entries(sightings)) {
  const filePath = resolve(entriesDir, `${slug}.md`);
  let text;
  try {
    text = await readFile(filePath, 'utf-8');
  } catch {
    console.warn(`  ! ${slug}.md not found, skipping`);
    continue;
  }
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) {
    console.warn(`  ! ${slug}.md missing frontmatter, skipping`);
    continue;
  }
  let frontmatter = m[1];
  const body = m[2];

  // Replace or insert sightings block
  const sightingsYaml = formatSightings(data.sightings ?? []);
  if (/^sightings:.*$/m.test(frontmatter)) {
    // Remove existing sightings block (line + indented continuation)
    frontmatter = frontmatter.replace(/^sightings:[\s\S]*?(?=^[a-zA-Z]|\Z)/m, sightingsYaml + '\n');
  } else {
    // Insert before territories: line if it exists, else append
    if (/^territories:/m.test(frontmatter)) {
      frontmatter = frontmatter.replace(/^territories:/m, sightingsYaml + '\nterritories:');
    } else {
      frontmatter = frontmatter.trimEnd() + '\n' + sightingsYaml;
    }
  }

  // Append extra sources to existing sources block
  const extraSources = data.extraSources ?? [];
  if (extraSources.length > 0) {
    const sourcesMatch = frontmatter.match(/^(sources:\n(?:  -[\s\S]*?)+)(?=^[a-zA-Z]|$(?![\s\S]))/m);
    if (sourcesMatch) {
      const merged = sourcesMatch[1].trimEnd() + '\n' + formatSources(extraSources) + '\n';
      frontmatter = frontmatter.replace(sourcesMatch[1], merged);
    }
  }

  // Add image if available
  const img = images[slug];
  if (img && img.url) {
    const imageEntry = [{
      src: `./${slug}/card.jpg`,
      alt: img.alt || `${slug} illustration`,
      credit: `${img.author || 'Unknown'} (${img.license || 'CC'})`,
      creditUrl: img.url,
    }];
    const imagesYaml = formatImages(imageEntry);
    if (/^images:.*$/m.test(frontmatter)) {
      frontmatter = frontmatter.replace(/^images:[\s\S]*?(?=^[a-zA-Z]|\Z)/m, imagesYaml + '\n');
    }
  }

  await writeFile(filePath, `---\n${frontmatter.trimEnd()}\n---\n${body}`);
  updated.push(slug);
}
console.log(`\n✔ Updated ${updated.length} existing entities`);

// ─── Create new entity files ───────────────────────────────────────────
const territoryDir = resolve(root, 'src/data/territories');
const created = [];
for (const [slug, data] of Object.entries(newEntities)) {
  const filePath = resolve(entriesDir, `${slug}.md`);

  const sources = data.sources ?? [];
  const sightingsArr = data.sightings ?? [];
  const img = images[slug];
  const imageEntry = img && img.url
    ? [{
        src: `./${slug}/card.jpg`,
        alt: img.alt || `${slug} illustration`,
        credit: `${img.author || 'Unknown'} (${img.license || 'CC'})`,
        creditUrl: img.url,
      }]
    : [];

  const fm = [
    `name: ${quoteYaml(data.name)}`,
    data.tagline ? `tagline: ${quoteYaml(data.tagline)}` : null,
    `faction: ${data.faction}`,
    `firstAppearance: ${data.firstAppearance}`,
    `firstAppearanceFuzzy: ${data.firstAppearanceFuzzy ?? false}`,
    `lastAppearance: ${data.lastAppearance ?? 'null'}`,
    'locations:',
    ...(data.locations ?? []).map((l) => `  - ${quoteYaml(l)}`),
    formatImages(imageEntry),
    'sources:',
    ...sources.map((s) => `  - url: ${quoteYaml(s.url)}\n    title: ${quoteYaml(s.title)}`),
    formatSightings(sightingsArr),
    'territories:',
    `  - ${quoteYaml(slug + '.geojson')}`,
    'draft: false',
  ].filter(Boolean).join('\n');

  const body = data.body || `(Add description here.)`;
  await writeFile(filePath, `---\n${fm}\n---\n\n${body}\n`);

  // Placeholder polygon — will be refined manually or by another agent
  const center = data.geoCenter || { lat: 39.5, lon: -98.35 };
  const r = data.geoRadius || 0.25;
  const territoryPath = resolve(territoryDir, `${slug}.geojson`);
  let exists = false;
  try { await stat(territoryPath); exists = true; } catch {}
  if (!exists) {
    const polygon = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          firstYear: data.firstAppearance,
          lastYear: data.lastAppearance ?? null,
          note: data.geoNote || `Reported region around ${data.locations?.[0] ?? 'unknown'}.`,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [makeCircle(center.lat, center.lon, r, 16)],
        },
      }],
    };
    await writeFile(territoryPath, JSON.stringify(polygon, null, 2) + '\n');
  }

  created.push(slug);
}
console.log(`✔ Created ${created.length} new entities`);

function makeCircle(lat, lon, r, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = +(lon + r * Math.cos(a)).toFixed(4);
    const y = +(lat + r * Math.sin(a) * 0.7).toFixed(4); // squash for lat
    pts.push([x, y]);
  }
  return pts;
}

// ─── Write attribution.txt files ──────────────────────────────────────
let wroteAttr = 0;
for (const [slug, img] of Object.entries(images)) {
  if (!img.url) continue;
  const dir = resolve(root, 'public/entities', slug);
  await mkdir(dir, { recursive: true });
  const txt =
    `card.jpg\n` +
    `  Source: ${img.url}\n` +
    `  License: ${img.license || 'unknown'}\n` +
    `  Author: ${img.author || 'unknown'}\n`;
  await writeFile(resolve(dir, 'attribution.txt'), txt);
  wroteAttr++;
}
console.log(`✔ Wrote ${wroteAttr} attribution.txt files`);

console.log('\nDone.');
