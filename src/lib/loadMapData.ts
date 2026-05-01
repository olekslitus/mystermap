import { getCollection, getEntry } from 'astro:content';

export interface MapSighting {
  lat: number;
  lon: number;
  year: number | null;
  date?: string;
  location: string;
  description: string;
  sourceType: string;
  sourceUrl: string;
  sourceTitle: string;
}

export interface MapEntity {
  slug: string;
  name: string;
  tagline: string | null;
  faction: {
    slug: string;
    name: string;
    color: string;
    icon: string;
  };
  firstAppearance: number;
  firstAppearanceFuzzy: boolean;
  lastAppearance: number | null;
  locations: string[];
  geojson: GeoJSON.FeatureCollection;
  sightings: MapSighting[];
  href: string;
}

export interface MapFaction {
  slug: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  order: number;
  count: number;
}

export interface MapPlace {
  slug: string;
  name: string;
  type: string;
  significance: string;
  locations: string[];
  lat: number;
  lon: number;
  established: number | null;
  relatedEntities: string[];
  href: string;
}

export interface MapData {
  factions: MapFaction[];
  entities: MapEntity[];
  places: MapPlace[];
  yearRange: { min: number; max: number };
}

// Vite inlines all territory GeoJSON files at build time. Each module exports
// the parsed FeatureCollection. The keys are absolute /src paths.
const territoryModules = import.meta.glob<string>(
  '/src/data/territories/*.geojson',
  { eager: true, query: '?raw', import: 'default' },
);

const territoriesByFilename = new Map<string, GeoJSON.FeatureCollection>();
for (const [filePath, raw] of Object.entries(territoryModules)) {
  const filename = filePath.split('/').pop()!;
  const parsed = JSON.parse(raw) as GeoJSON.FeatureCollection;
  if (parsed.type !== 'FeatureCollection') {
    throw new Error(`${filename}: expected GeoJSON FeatureCollection, got ${parsed.type}`);
  }
  territoriesByFilename.set(filename, parsed);
}

export async function loadMapData(baseUrl: string): Promise<MapData> {
  const factionEntries = await getCollection('factions');
  const entityEntries = await getCollection('entities', ({ data }) => !data.draft);
  const placeEntries = await getCollection('places', ({ data }) => !data.draft);

  const entities: MapEntity[] = [];
  for (const entry of entityEntries) {
    const factionRef = entry.data.faction;
    const factionEntry = await getEntry(factionRef);
    if (!factionEntry) {
      throw new Error(`Entity "${entry.id}" references unknown faction "${factionRef.id}"`);
    }
    const faction = factionEntry.data;

    const merged: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    for (const filename of entry.data.territories) {
      const fc = territoriesByFilename.get(filename);
      if (!fc) {
        throw new Error(
          `Entity "${entry.id}" references missing territory file "src/data/territories/${filename}". ` +
          `Known files: ${[...territoriesByFilename.keys()].join(', ')}`,
        );
      }
      // Stamp entity slug onto each feature for click-time lookup.
      for (const feature of fc.features) {
        feature.properties = { ...(feature.properties ?? {}), entity: entry.id };
      }
      merged.features.push(...fc.features);
    }

    entities.push({
      slug: entry.id,
      name: entry.data.name,
      tagline: entry.data.tagline ?? null,
      faction: {
        slug: faction.slug,
        name: faction.name,
        color: faction.color,
        icon: faction.icon,
      },
      firstAppearance: entry.data.firstAppearance,
      firstAppearanceFuzzy: entry.data.firstAppearanceFuzzy,
      lastAppearance: entry.data.lastAppearance,
      locations: entry.data.locations,
      geojson: merged,
      sightings: entry.data.sightings,
      href: joinPath(baseUrl, `entities/${entry.id}/`),
    });
  }

  const counts = new Map<string, number>();
  for (const e of entities) counts.set(e.faction.slug, (counts.get(e.faction.slug) ?? 0) + 1);

  const factions: MapFaction[] = factionEntries
    .map((f) => ({
      slug: f.data.slug,
      name: f.data.name,
      color: f.data.color,
      icon: f.data.icon,
      description: f.data.description,
      order: f.data.order,
      count: counts.get(f.data.slug) ?? 0,
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const places: MapPlace[] = placeEntries.map((p) => ({
    slug: p.id,
    name: p.data.name,
    type: p.data.type,
    significance: p.data.significance,
    locations: p.data.locations,
    lat: p.data.lat,
    lon: p.data.lon,
    established: p.data.established,
    relatedEntities: p.data.relatedEntities,
    href: joinPath(baseUrl, `places/${p.id}/`),
  }));

  const years = entities.map((e) => e.firstAppearance);
  const yearRange = {
    min: Math.min(1600, ...years),
    max: Math.max(new Date().getFullYear(), ...years),
  };

  return { factions, entities, places, yearRange };
}

function joinPath(base: string, sub: string): string {
  const b = base.endsWith('/') ? base : base + '/';
  return b + sub.replace(/^\/+/, '');
}
