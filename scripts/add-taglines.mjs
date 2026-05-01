#!/usr/bin/env node
// Add a `tagline:` line to each existing entity .md file (after `name:`).
// Skips if the file already has a tagline.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dir = resolve(root, 'src/content/entities');

const taglines = {
  mothman: "A red-eyed winged figure that haunted Point Pleasant before the Silver Bridge fell.",
  "jersey-devil": "A goat-headed, bat-winged Pine Barrens devil born — they say — from a 13th child's curse.",
  bigfoot: "The Pacific Northwest's tallest, hairiest open question, walking since 1958.",
  "flatwoods-monster": "A spade-headed apparition that fell from the West Virginia sky in September 1952.",
  "dover-demon": "A small orange-eyed creature seen on three Massachusetts roads over forty-eight April hours in 1977.",
  "fouke-monster": "A swamp-walking biped that broke into an Arkansas farmhouse and inspired a 1972 cult film.",
  "beast-of-bray-road": "A Wisconsin werewolf seen on a single rural road, by drivers who'd rather not talk about it.",
  wendigo: "An Algonquian famine-spirit older than this country, walking the cold woods to this day.",
  "bishopville-lizard-man": "A scaly, three-fingered humanoid that climbed onto a teenager's car beside a South Carolina swamp.",
  "loveland-frog": "Frog-faced humanoids seen by Ohio police along the Little Miami River bridges.",
  "dulce-base": "A New Mexico mesa rumored to hide an underground human-alien laboratory.",
  skinwalker: "A shape-shifting Diné witch, named only with caution and never lightly.",
  champ: "America's most-witnessed lake monster, raising its long neck above Lake Champlain since 1609.",
  "bear-lake-monster": "A serpentine shape in turquoise Bear Lake, reported by Mormon settlers and Shoshone alike.",
  illie: "A whale-shaped shadow in Alaska's largest lake, where the deeper currents have not been mapped.",
  roswell: "The 1947 New Mexico crash that began the American story of recovered alien craft.",
  "area-51": "A Nevada base that did not officially exist for 58 years.",
  "phoenix-lights": "The 1997 Arizona V-formation that thousands watched and a governor saw twice.",
  "hudson-valley-ufo": "A football-field-sized boomerang silently drifting over New York's wealthier suburbs.",
  "fresno-nightcrawlers": "Two thin white legs walking past a California front yard at 3 AM.",
  "salem-witch-trials": "Nineteen hangings, one stoning, and 200 accused — the season America most studies and least forgives.",
  "bell-witch": "An invisible Tennessee entity that called itself Kate, killed a man, and quoted scripture verbatim.",
  gettysburg: "Fifty thousand casualties in three days, and a battlefield that has never quite emptied.",
  "new-orleans-french-quarter": "Twelve square blocks of jazz, voodoo, and unfinished business since 1814.",
  "new-england-vampire": "A century of exhumations across rural New England, tuberculosis given a face.",
  "thunderbird-illinois": "A bird wide enough to lift a child, photographed nowhere and seen by Lawndale's mother.",
  chupacabra: "The blood-drained livestock and red-eyed silhouettes that have haunted the Rio Grande since 1995.",
  "honey-island-swamp": "A seven-foot, three-toed cryptid in 70,000 acres of Louisiana cypress and Spanish moss.",
};

let updated = 0;
let skipped = 0;
for (const [slug, tagline] of Object.entries(taglines)) {
  const file = resolve(dir, `${slug}.md`);
  let text;
  try { text = await readFile(file, 'utf-8'); } catch { continue; }
  if (/^tagline:/m.test(text)) {
    skipped++;
    continue;
  }
  const next = text.replace(/^(name: .*)$/m, `$1\ntagline: ${JSON.stringify(tagline)}`);
  if (next === text) {
    console.warn(`  ! ${slug}: no name: line found`);
    continue;
  }
  await writeFile(file, next);
  updated++;
}
console.log(`✔ Added taglines to ${updated} entities, skipped ${skipped}`);
