---
# Copy this file to <slug>.md (lowercase, hyphens) and fill it in.
# Delete the comments before committing.
name: My Cryptid
tagline: "One evocative line shown on map hover (10-160 chars)."
faction: cryptid                       # must match a slug in src/content/factions/
firstAppearance: 1900                  # year first sighted/recorded
firstAppearanceFuzzy: false            # true if year is approximate
lastAppearance: null                   # null = still active; set a year if extinct/quiet
locations:
  - "Town, ST"
images:
  - src: "./my-cryptid/card.jpg"       # filename only — site looks under public/entities/<slug>/
    alt: "Description for screen readers"
    credit: "Photo by ... (CC BY-SA 4.0)"
    creditUrl: "https://commons.wikimedia.org/wiki/File:..." # optional
sources:
  - url: "https://..."
    title: "Source title (Wikipedia, museum, news, etc.)"
sightings:
  - lat: 42.0000                       # decimal degrees, ~4 decimals
    lon: -71.0000
    year: 1971                         # or null if unknown; use `date` for finer detail
    date: "1971-08-21"                 # optional, ISO format preferred
    location: "Town, ST"
    description: "Short specific description of this sighting (~30 words)."
    sourceType: "news"                 # news|museum|official|academic|blog|reddit|book|podcast|video|social|other
    sourceUrl: "https://..."
    sourceTitle: "Title of the source"
territories:
  - "my-cryptid.geojson"               # filename in src/data/territories/
draft: true                            # remove or set false when ready to ship
---

A short, evocative description in 3 to 6 paragraphs. Tell us when, where,
who, what. Cite specific dates and witnesses where you can. End with
something atmospheric that makes a visitor want to know more — not an
encyclopedia summary.
