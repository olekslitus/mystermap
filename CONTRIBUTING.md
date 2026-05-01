# Contributing to MysterMap

We love new entries. The bar is: a documented sighting or tradition
associated with a real US location. The site favors *story* over
encyclopedia, so write like you are sharing campfire history — short,
careful, sourced.

## What you'll change

Adding one entity touches three or four places:

| Path | What goes here |
| --- | --- |
| `src/content/entities/<slug>.md` | The entity profile (frontmatter + body) |
| `src/data/territories/<slug>.geojson` | The polygon(s) on the map |
| `public/entities/<slug>/*.jpg` (or `.png`) | Images, if any |
| `public/entities/<slug>/attribution.txt` | Image source + license, required |

`<slug>` must be lowercase, with hyphens, and unique across the site
(e.g., `mothman`, `salem-witch-trials`, `bear-lake-monster`).

## Step by step

### 1. Pick or add a faction

Open `src/content/factions/`. The shipped factions are: `cryptid`,
`alien`, `witch`, `ghost`, `vampire`, `reptilian`, `lake-monster`,
`shapeshifter`, `thunderbird`. If your entity fits one, you're done.

To add a new faction, create `src/content/factions/<slug>.yaml`:

```yaml
name: Mermaid
slug: mermaid
color: "#3a8a9a"     # hex color used for polygons + filter chip
icon: "🧜"            # one emoji or short character
order: 75             # filter-rail position (lower = earlier)
description: |
  A short paragraph describing the faction.
```

### 2. Create the entity Markdown

Copy the template:

```bash
cp src/content/entities/_template.md src/content/entities/<your-slug>.md
```

Fill in the frontmatter. The required fields are:

```yaml
name: My Cryptid                       # display name
faction: cryptid                       # must match an existing faction slug
firstAppearance: 1900                  # year first sighted
firstAppearanceFuzzy: false            # true if year is approximate
lastAppearance: null                   # null = still active; year = went quiet
locations:
  - "Town, ST"                         # one or more
images:
  - src: "./<your-slug>/card.jpg"
    alt: "Description for screen readers"
    credit: "Photo by ... (CC BY-SA 4.0)"
    creditUrl: "https://..."           # optional but encouraged
sources:
  - url: "https://..."
    title: "Source title"
territories:
  - "<your-slug>.geojson"
draft: true                            # set false (or remove) to ship
```

Then write the body — 2 to 4 short paragraphs of description. End with
something atmospheric, not encyclopedic.

### 3. Draw the polygon

We use plain GeoJSON so the data is portable and tool-agnostic.

1. Go to <https://geojson.io>.
2. Use the polygon tool (top right) to draw the territory. For an event
   (Roswell, Phoenix Lights), draw a small polygon roughly 0.3° across.
   For a regional cryptid (Bigfoot), draw a larger polygon. For a
   pinpoint (Salem), draw a small one.
3. Click the polygon you drew, edit its properties to add:
   - `firstYear`: the year this polygon "appears" on the timeline.
   - `lastYear`: `null` for still-active, or a year for one-time / extinct.
   - `note`: one short sentence (optional but nice).
4. Copy the JSON from the right pane into
   `src/data/territories/<your-slug>.geojson`.
5. Replace the empty `properties` on each Feature with at least
   `{"firstYear": 1966, "lastYear": null}` — the build adds the entity
   slug automatically.

### 4. Add images

Images live under `public/entities/<your-slug>/`. Best practice:

- Source from **Wikimedia Commons** (public domain or CC-licensed).
- Save as `card.jpg` (the hero image, 1200×800ish) plus any others.
- Create `public/entities/<your-slug>/attribution.txt` listing every
  image's source URL and license. Example:

```
card.jpg
  Source: https://commons.wikimedia.org/wiki/File:Mothman.jpg
  License: CC BY-SA 4.0
  Author: Jane Doe
```

The `npm run check-attribution` script (see below) will fail your CI
build if any image lacks attribution.

### 5. Verify locally

```bash
npm run dev
```

Open <http://localhost:4321/mystermap/> and check that:

- Your polygon appears on the map in your faction's color.
- Clicking it opens the side panel with your entity's name and year.
- "Read more" goes to your entity's detail page.
- The slider hides your polygon when set below `firstYear`.
- The faction filter chip toggles your polygon on and off.

### 6. Open a PR

Use the PR template. Include source links in the description. We'll
review for: factual sourcing, polygon reasonableness, image licensing,
and tone.

## Style notes

- Keep entity bodies short — 2 to 4 paragraphs. Atmosphere over
  exhaustiveness.
- Indigenous traditions: cite Indigenous-led writing where possible. If
  in doubt, say less, link more.
- Folklore is folklore. We do not litigate truth claims; we document
  what people have *said*.

## Useful scripts

```bash
npm run new-entity            # interactive scaffolder for a new entity
npm run check-attribution     # verify every image has attribution.txt
npm run build                 # type-check + production build
npm run preview               # serve dist/ for a final look
```
