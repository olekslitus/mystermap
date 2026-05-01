#!/usr/bin/env node
// Interactive scaffolder for a new entity. Prompts for the basics, then
// writes src/content/entities/<slug>.md, src/data/territories/<slug>.geojson,
// and an empty public/entities/<slug>/ directory.
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(q, fallback = '') {
  const a = (await rl.question(`${q}${fallback ? ` (${fallback})` : ''}: `)).trim();
  return a || fallback;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const factionFiles = await readdir(resolve(root, 'src/content/factions'));
const factions = factionFiles.filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/\.yaml$/, ''));

console.log('\nMysterMap — new entity scaffold\n');
console.log('Available factions:', factions.join(', '), '\n');

const name = await ask('Entity name', 'Loch Lurker');
const slug = slugify(await ask('Slug', slugify(name)));
const faction = await ask('Faction slug', 'cryptid');
if (!factions.includes(faction)) {
  console.error(`\n✗ Unknown faction "${faction}". Add it to src/content/factions/ first.`);
  process.exit(1);
}
const year = await ask('First-appearance year', '1900');
const fuzzy = (await ask('Year fuzzy? (y/n)', 'n')).toLowerCase().startsWith('y');
const location = await ask('Primary location (Town, ST)', 'Springfield, MA');
const lat = await ask('Approx latitude', '42.1');
const lon = await ask('Approx longitude', '-72.6');

rl.close();

const entityPath = resolve(root, `src/content/entities/${slug}.md`);
const territoryPath = resolve(root, `src/data/territories/${slug}.geojson`);
const publicDir = resolve(root, `public/entities/${slug}`);

const entityMd = `---
name: ${name}
faction: ${faction}
firstAppearance: ${parseInt(year, 10) || 1900}
firstAppearanceFuzzy: ${fuzzy}
lastAppearance: null
locations:
  - "${location}"
images: []
sources:
  - url: "https://example.com/replace-me"
    title: "Replace me with a real source"
territories:
  - "${slug}.geojson"
draft: true
---

A short, evocative description (2–4 paragraphs). Tell us when, where,
who, what. End with what makes this place feel like a place a visitor
would want to know about.
`;

const lat0 = parseFloat(lat) || 42;
const lon0 = parseFloat(lon) || -72;
const halfDeg = 0.15;
const territory = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        firstYear: parseInt(year, 10) || 1900,
        lastYear: null,
        note: '(Edit this polygon at https://geojson.io)',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [lon0 - halfDeg, lat0 - halfDeg],
            [lon0 + halfDeg, lat0 - halfDeg],
            [lon0 + halfDeg, lat0 + halfDeg],
            [lon0 - halfDeg, lat0 + halfDeg],
            [lon0 - halfDeg, lat0 - halfDeg],
          ],
        ],
      },
    },
  ],
};

await writeFile(entityPath, entityMd);
await writeFile(territoryPath, JSON.stringify(territory, null, 2) + '\n');
await mkdir(publicDir, { recursive: true });
await writeFile(resolve(publicDir, '.gitkeep'), '');

console.log(`\n✔ Created:`);
console.log(`  ${entityPath.replace(root + '/', '')}`);
console.log(`  ${territoryPath.replace(root + '/', '')}`);
console.log(`  ${publicDir.replace(root + '/', '')}/`);
console.log(`\nNext steps:`);
console.log(`  1. Open ${slug}.md and write the description + add real sources`);
console.log(`  2. Refine the polygon at https://geojson.io and replace ${slug}.geojson`);
console.log(`  3. Add images + attribution.txt to public/entities/${slug}/`);
console.log(`  4. Set draft: false in ${slug}.md`);
console.log(`  5. npm run dev — your entity should appear on the map\n`);
