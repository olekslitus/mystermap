#!/usr/bin/env node
// Download Wikimedia Commons images per .research-images.json into
// public/entities/<slug>/card.jpg. Skips entries without a URL or where
// the file already exists.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const imagesPath = resolve(root, '.research-images.json');

const data = JSON.parse(await readFile(imagesPath, 'utf-8'));

const USER_AGENT = 'MysterMap/0.1 (https://github.com/mystermap; oleks.litus@gmail.com) static-site builder';
let downloaded = 0;
let skipped = 0;
let failed = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [slug, entry] of Object.entries(data)) {
  if (!entry.url) {
    skipped++;
    continue;
  }
  const dir = resolve(root, 'public/entities', slug);
  const file = resolve(dir, 'card.jpg');
  try { await stat(file); skipped++; continue; } catch {}

  let attempt = 0;
  let lastStatus = 0;
  let success = false;
  while (attempt < 4 && !success) {
    attempt++;
    try {
      process.stdout.write(`  ${slug} (try ${attempt})…`);
      const res = await fetch(entry.url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'image/*' },
        redirect: 'follow',
      });
      lastStatus = res.status;
      if (res.status === 429) {
        const wait = 2000 * attempt;
        console.log(` 429, waiting ${wait}ms`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        console.log(` failed (${res.status})`);
        break;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(dir, { recursive: true });
      await writeFile(file, buf);
      console.log(` ${(buf.length / 1024).toFixed(0)} KB`);
      downloaded++;
      success = true;
    } catch (e) {
      console.log(` error: ${e.message}`);
      break;
    }
    await sleep(800); // gentle pacing
  }
  if (!success) {
    failed.push({ slug, status: lastStatus });
  }
}

console.log(`\n✔ Downloaded ${downloaded}, skipped ${skipped}, failed ${failed.length}`);
if (failed.length > 0) {
  console.log('Failed entries:');
  for (const f of failed) console.log(`  - ${f.slug}: ${f.status ?? f.error}`);
}
