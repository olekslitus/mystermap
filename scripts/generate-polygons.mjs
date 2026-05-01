#!/usr/bin/env node
// Generate detailed polygons for all 28 (and any new) entities.
// Replaces the rectangular v1 polygons with multi-vertex shapes that
// follow the rough form of the underlying geographic feature.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const territoryDir = resolve(root, 'src/data/territories');

// Shape generators. All return arrays of [lon, lat] pairs, closed (first==last).

function roundTo(n, decimals = 4) {
  return +n.toFixed(decimals);
}

// Random-but-deterministic per-seed PRNG so the same seed produces the
// same polygon on every run.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generic irregular blob: n vertices around a center, varying radius.
function blob({ lat, lon, latR, lonR, n, jitter = 0.35, seed = 1 }) {
  const rnd = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const theta = (i / n) * Math.PI * 2;
    const variance = 1 - jitter / 2 + rnd() * jitter;
    const x = lon + Math.cos(theta) * lonR * variance;
    const y = lat + Math.sin(theta) * latR * variance;
    pts.push([roundTo(x), roundTo(y)]);
  }
  pts.push(pts[0]); // close
  return pts;
}

// Polygon along a path of waypoints, with lateral half-width.
function alongPath({ waypoints, halfWidth, n, seed = 1 }) {
  // waypoints is [[lat, lon], ...] (note: lat first here for readability).
  // Creates a polygon by walking left of the path and back along right.
  const rnd = mulberry32(seed);
  const sampled = sampleWaypoints(waypoints, n);
  const left = [];
  const right = [];
  for (let i = 0; i < sampled.length; i++) {
    const [lat, lon] = sampled[i];
    const next = sampled[Math.min(i + 1, sampled.length - 1)];
    const prev = sampled[Math.max(i - 1, 0)];
    const dx = next[1] - prev[1];
    const dy = next[0] - prev[0];
    const norm = Math.hypot(dx, dy) || 1;
    // Perpendicular: (-dy, dx) normalized
    const nx = -dy / norm;
    const ny = dx / norm;
    const variance = 0.7 + rnd() * 0.6;
    const w = halfWidth * variance;
    left.push([roundTo(lon + nx * w), roundTo(lat + ny * w)]);
    right.push([roundTo(lon - nx * w), roundTo(lat - ny * w)]);
  }
  // Walk forward on left, then back on right
  const ring = [...left, ...right.reverse()];
  ring.push(ring[0]);
  return ring;
}

function sampleWaypoints(wps, n) {
  // Linear-interpolate along the polyline to produce n+1 evenly spaced points.
  // Compute cumulative arc length (in degrees, fine for our scale).
  const lengths = [0];
  for (let i = 1; i < wps.length; i++) {
    const dx = wps[i][1] - wps[i - 1][1];
    const dy = wps[i][0] - wps[i - 1][0];
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  const total = lengths[lengths.length - 1];
  const sampled = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * total;
    let j = 1;
    while (j < lengths.length - 1 && lengths[j] < t) j++;
    const t0 = lengths[j - 1];
    const t1 = lengths[j];
    const frac = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const lat = wps[j - 1][0] + (wps[j][0] - wps[j - 1][0]) * frac;
    const lon = wps[j - 1][1] + (wps[j][1] - wps[j - 1][1]) * frac;
    sampled.push([lat, lon]);
  }
  return sampled;
}

// Specs: one per entity. Pick the right generator + parameters.
// Lat/lon roughly follow real geography; jitter & vertex counts give organic shapes.
const specs = {
  // Cryptids
  mothman: { gen: 'blob', lat: 38.8500, lon: -82.1200, latR: 0.20, lonR: 0.18, n: 14, jitter: 0.5, seed: 11 },
  'jersey-devil': { gen: 'blob', lat: 39.7500, lon: -74.5500, latR: 0.55, lonR: 0.55, n: 22, jitter: 0.4, seed: 12 },
  bigfoot: {
    gen: 'alongPath',
    halfWidth: 1.2,
    n: 26,
    seed: 13,
    waypoints: [
      [48.85, -121.55], [48.20, -121.30], [47.10, -121.65], [46.20, -121.45],
      [45.40, -121.85], [44.20, -122.20], [43.30, -122.50], [42.40, -122.80],
      [41.50, -123.00], [40.40, -123.50],
    ],
  },
  'flatwoods-monster': { gen: 'blob', lat: 38.7200, lon: -80.6500, latR: 0.18, lonR: 0.18, n: 12, jitter: 0.5, seed: 14 },
  'dover-demon': { gen: 'blob', lat: 42.2500, lon: -71.2800, latR: 0.06, lonR: 0.07, n: 11, jitter: 0.45, seed: 15 },
  'fouke-monster': {
    gen: 'alongPath',
    halfWidth: 0.18,
    n: 16,
    seed: 16,
    waypoints: [
      [33.10, -94.20], [33.20, -94.10], [33.30, -94.05], [33.40, -93.95], [33.50, -93.85],
    ],
  },
  'beast-of-bray-road': { gen: 'blob', lat: 42.6700, lon: -88.5500, latR: 0.20, lonR: 0.22, n: 13, jitter: 0.5, seed: 17 },
  wendigo: { gen: 'blob', lat: 47.0000, lon: -92.5000, latR: 1.20, lonR: 4.20, n: 24, jitter: 0.45, seed: 18 },
  'bishopville-lizard-man': {
    gen: 'alongPath',
    halfWidth: 0.18,
    n: 16,
    seed: 19,
    waypoints: [
      [34.10, -80.40], [34.20, -80.30], [34.27, -80.20], [34.32, -80.10],
    ],
  },
  'loveland-frog': {
    gen: 'alongPath',
    halfWidth: 0.10,
    n: 16,
    seed: 20,
    waypoints: [
      [39.10, -84.30], [39.20, -84.27], [39.27, -84.26], [39.34, -84.20], [39.42, -84.15],
    ],
  },
  // Reptilian
  'dulce-base': { gen: 'blob', lat: 36.9300, lon: -106.9800, latR: 0.20, lonR: 0.25, n: 13, jitter: 0.55, seed: 21 },
  // Shapeshifter
  skinwalker: {
    gen: 'blob',
    lat: 36.2500, lon: -109.5000,
    latR: 1.10, lonR: 1.90,
    n: 26, jitter: 0.55, seed: 22,
  },
  // Lake monsters
  champ: {
    gen: 'alongPath',
    halfWidth: 0.06,
    n: 30,
    seed: 23,
    waypoints: [
      [43.55, -73.43], [43.75, -73.40], [43.95, -73.38], [44.15, -73.40],
      [44.30, -73.30], [44.45, -73.25], [44.60, -73.30], [44.75, -73.35],
      [44.90, -73.32], [45.00, -73.30], [45.05, -73.25],
    ],
  },
  'bear-lake-monster': {
    gen: 'alongPath',
    halfWidth: 0.07,
    n: 22,
    seed: 24,
    waypoints: [
      [41.95, -111.40], [42.05, -111.36], [42.15, -111.32], [42.22, -111.28],
      [42.28, -111.23], [42.30, -111.20],
    ],
  },
  illie: { gen: 'blob', lat: 59.6000, lon: -154.8000, latR: 0.36, lonR: 1.00, n: 24, jitter: 0.45, seed: 25 },
  // Aliens
  roswell: { gen: 'blob', lat: 33.4000, lon: -104.5300, latR: 0.20, lonR: 0.22, n: 14, jitter: 0.55, seed: 26 },
  'area-51': { gen: 'blob', lat: 37.2400, lon: -115.8100, latR: 0.32, lonR: 0.30, n: 14, jitter: 0.30, seed: 27 },
  'phoenix-lights': { gen: 'blob', lat: 33.4500, lon: -112.0700, latR: 0.30, lonR: 0.40, n: 18, jitter: 0.5, seed: 28 },
  'hudson-valley-ufo': { gen: 'blob', lat: 41.4000, lon: -73.7000, latR: 0.55, lonR: 0.65, n: 20, jitter: 0.45, seed: 29 },
  'fresno-nightcrawlers': { gen: 'blob', lat: 36.7400, lon: -119.7800, latR: 0.10, lonR: 0.11, n: 12, jitter: 0.45, seed: 30 },
  // Witches
  'salem-witch-trials': { gen: 'blob', lat: 42.5500, lon: -70.9500, latR: 0.13, lonR: 0.18, n: 14, jitter: 0.45, seed: 31 },
  'bell-witch': { gen: 'blob', lat: 36.5800, lon: -87.0600, latR: 0.18, lonR: 0.22, n: 14, jitter: 0.5, seed: 32 },
  // Ghosts
  gettysburg: { gen: 'blob', lat: 39.8100, lon: -77.2300, latR: 0.10, lonR: 0.12, n: 16, jitter: 0.4, seed: 33 },
  'new-orleans-french-quarter': { gen: 'blob', lat: 29.9580, lon: -90.0640, latR: 0.014, lonR: 0.022, n: 10, jitter: 0.18, seed: 34 },
  // Vampires
  'new-england-vampire': { gen: 'blob', lat: 41.7000, lon: -71.7000, latR: 0.55, lonR: 0.65, n: 20, jitter: 0.5, seed: 35 },
  // Thunderbird
  'thunderbird-illinois': { gen: 'blob', lat: 39.9000, lon: -90.1000, latR: 0.45, lonR: 0.55, n: 16, jitter: 0.5, seed: 36 },
  // Other cryptids
  chupacabra: { gen: 'blob', lat: 27.5000, lon: -98.5000, latR: 1.10, lonR: 1.40, n: 20, jitter: 0.5, seed: 37 },
  'honey-island-swamp': {
    gen: 'alongPath',
    halfWidth: 0.18,
    n: 16,
    seed: 38,
    waypoints: [
      [30.20, -89.80], [30.35, -89.75], [30.45, -89.70], [30.55, -89.65], [30.65, -89.60],
    ],
  },
  // ─── New entities (placeholders also generated here so we don't need to plumb data twice) ───
  goatman: { gen: 'blob', lat: 38.9000, lon: -76.7500, latR: 0.20, lonR: 0.22, n: 14, jitter: 0.5, seed: 41 },
  'pope-lick-monster': { gen: 'blob', lat: 38.2500, lon: -85.5500, latR: 0.10, lonR: 0.12, n: 12, jitter: 0.5, seed: 42 },
  'skunk-ape': { gen: 'blob', lat: 25.9000, lon: -81.1000, latR: 0.65, lonR: 0.55, n: 22, jitter: 0.5, seed: 43 },
  'la-lechuza': { gen: 'blob', lat: 26.6000, lon: -98.5000, latR: 1.00, lonR: 1.30, n: 20, jitter: 0.5, seed: 44 },
  'hopkinsville-goblins': { gen: 'blob', lat: 36.8400, lon: -87.3700, latR: 0.10, lonR: 0.12, n: 12, jitter: 0.45, seed: 45 },
  'mogollon-monster': {
    gen: 'alongPath',
    halfWidth: 0.40,
    n: 22,
    seed: 46,
    waypoints: [
      [34.10, -111.50], [34.30, -111.20], [34.50, -110.80], [34.60, -110.40], [34.55, -109.90],
    ],
  },
  snallygaster: { gen: 'blob', lat: 39.4500, lon: -77.4500, latR: 0.30, lonR: 0.30, n: 16, jitter: 0.5, seed: 47 },
  'bunny-man': { gen: 'blob', lat: 38.8200, lon: -77.3700, latR: 0.06, lonR: 0.07, n: 12, jitter: 0.4, seed: 48 },
  'lake-norman-monster': {
    gen: 'alongPath',
    halfWidth: 0.06,
    n: 20,
    seed: 49,
    waypoints: [
      [35.40, -80.95], [35.55, -80.92], [35.65, -80.90], [35.75, -80.88], [35.80, -80.85],
    ],
  },
  'devils-tramping-ground': { gen: 'blob', lat: 35.6800, lon: -79.4900, latR: 0.04, lonR: 0.05, n: 10, jitter: 0.3, seed: 50 },
  'mad-gasser-of-mattoon': { gen: 'blob', lat: 39.4800, lon: -88.3700, latR: 0.10, lonR: 0.12, n: 12, jitter: 0.5, seed: 51 },
  'ozark-howler': { gen: 'blob', lat: 36.5000, lon: -93.5000, latR: 0.85, lonR: 1.10, n: 20, jitter: 0.5, seed: 52 },
  'bridgewater-triangle': { gen: 'blob', lat: 41.9000, lon: -71.0500, latR: 0.30, lonR: 0.35, n: 16, jitter: 0.45, seed: 53 },
};

let updated = 0;
let created = 0;

for (const [slug, spec] of Object.entries(specs)) {
  const filePath = resolve(territoryDir, `${slug}.geojson`);
  let existing = null;
  try { existing = JSON.parse(await readFile(filePath, 'utf-8')); } catch {}

  const ring = spec.gen === 'alongPath'
    ? alongPath({ waypoints: spec.waypoints, halfWidth: spec.halfWidth, n: spec.n, seed: spec.seed })
    : blob(spec);

  const properties = existing?.features?.[0]?.properties ?? {
    firstYear: 1900,
    lastYear: null,
    note: '',
  };

  const fc = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties,
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    ],
  };

  await writeFile(filePath, JSON.stringify(fc, null, 2) + '\n');
  if (existing) updated++; else created++;
}

console.log(`✔ Refined ${updated} polygons, created ${created} new.`);
