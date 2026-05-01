# MysterMap

A static, contributor-driven map of the United States as controlled by
supernatural forces — cryptids, aliens, ghosts, witches, lake monsters,
and shapeshifters. Click any territory to read its story. Drag the time
slider to watch supernatural America fill in across the centuries.
Toggle factions to follow a single thread: witches from Salem 1692
onward, lake monsters from the colonial era, alien sightings since 1947.

No database. No accounts. Everything is plain files in this repository.

## Local development

```bash
npm install
npm run dev
```

The dev server runs at <http://localhost:4321/mystermap/>.

## Build

```bash
npm run build      # type-check + static build into dist/
npm run preview    # serve dist/ for a final smoke test
```

## Project layout

```
src/
  content/factions/        # one YAML per faction (cryptid, alien, witch, …)
  content/entities/        # one Markdown per entity (Mothman, Salem, Roswell, …)
  data/territories/        # one GeoJSON per entity, the polygon(s) on the map
  components/MapIsland.astro   # the Leaflet map with slider + filter
  pages/                   # index, about, /entities/[slug], /factions/[slug]
  lib/loadMapData.ts       # build-time merge of all of the above
public/entities/<slug>/    # images for each entity (with attribution)
```

## Adding a new entity (the short version)

1. Pick or create a faction in `src/content/factions/<slug>.yaml`.
2. Copy `src/content/entities/_template.md` to
   `src/content/entities/<your-slug>.md` and fill in the frontmatter.
3. Draw a polygon at <https://geojson.io>, paste the FeatureCollection into
   `src/data/territories/<your-slug>.geojson`.
4. Drop one or more images into `public/entities/<your-slug>/` along with
   an `attribution.txt` describing the source/license.
5. `npm run dev`, see your entity on the map, open a PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the long version, including how
to source public-domain images from Wikimedia Commons.

## Tile provider

Carto Dark Matter is the default basemap — no API key required, and it
suits the moody theme. To switch to Stamen Watercolor (better for an old-
folklore feel, but requires a free Stadia Maps account for production),
edit the `L.tileLayer(...)` call in
[`src/components/MapIsland.astro`](src/components/MapIsland.astro).

## Deploy

The `.github/workflows/deploy.yml` workflow builds on every push to `main`
and publishes to GitHub Pages. After forking:

1. In repo Settings → Pages, set the source to **GitHub Actions**.
2. Update `astro.config.mjs` so `site` is `https://<your-user>.github.io`
   and `base` is `/<your-repo>` (or set the `SITE` and `BASE` env vars in
   the workflow).
3. Push to `main`.

## License

Code: MIT. Content: each entry is licensed individually — see the source
links in each entity's frontmatter and the `attribution.txt` next to each
image. Folklore is humanity's; we just collect it carefully.
