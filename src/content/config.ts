import { defineCollection, z, reference } from 'astro:content';
import { glob } from 'astro/loaders';

const factions = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/factions' }),
  schema: z.object({
    name: z.string(),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'lowercase, hyphens, alphanumerics only'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'CSS hex color, e.g. #7a9a3a'),
    icon: z.string().min(1).max(4),
    description: z.string(),
    order: z.number().int().default(100),
  }),
});

const entityImage = z.object({
  src: z.string(),
  alt: z.string(),
  credit: z.string(),
  creditUrl: z.string().url().optional(),
});

const entitySource = z.object({
  url: z.string().url(),
  title: z.string(),
});

const sourceType = z.enum(['news', 'museum', 'official', 'academic', 'blog', 'reddit', 'book', 'podcast', 'video', 'social', 'other']);

const sighting = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  year: z.number().int().min(1000).max(2100).nullable().default(null),
  date: z.string().optional(),
  location: z.string(),
  description: z.string(),
  sourceType: sourceType,
  sourceUrl: z.string().url(),
  sourceTitle: z.string(),
});

const entities = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/entities' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string().min(10).max(160).optional(),
    faction: reference('factions'),
    firstAppearance: z.number().int().min(1000).max(2100),
    firstAppearanceFuzzy: z.boolean().default(false),
    lastAppearance: z.number().int().min(1000).max(2100).nullable().default(null),
    locations: z.array(z.string()).min(1),
    images: z.array(entityImage).default([]),
    sources: z.array(entitySource).min(1),
    sightings: z.array(sighting).default([]),
    territories: z.array(z.string()).min(1),
    draft: z.boolean().default(false),
  }),
});

const placeType = z.enum([
  'mountain', 'church', 'cemetery', 'cave', 'site', 'vortex',
  'monument', 'house', 'lighthouse', 'forest', 'lake', 'other',
]);

const places = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/places' }),
  schema: z.object({
    name: z.string(),
    type: placeType,
    significance: z.string().min(10).max(220),
    locations: z.array(z.string()).min(1),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    established: z.number().int().min(-5000).max(2100).nullable().default(null),
    images: z.array(entityImage).default([]),
    sources: z.array(entitySource).min(1),
    relatedEntities: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { factions, entities, places };
