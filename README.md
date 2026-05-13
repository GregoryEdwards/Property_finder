# HomeSite — Property Finder

> A GIS multi-criteria decision-analysis tool for UK house hunters. Weight
> the spatial factors that matter to *you* (schools, commute, flood risk,
> A&E access, price, crime, air quality), and the app continuously surfaces
> the best zones on a map — alongside the live listings inside them.

**Phase 1 · Greater London**.
The 15 default criteria, persona presets, and listings are tuned for the
UK property market. The launch metro is Greater London (~M25); the same
engine extends to any UK metro by swapping the seed dataset.

---

## Quick start

```bash
npm install
npm run seed           # regenerate the London cell + listings seeds
npm run dev            # http://localhost:5173
```

Move the priority sliders or drag-to-rank on the left, watch the heatmap
redraw in real time, click a hex or a listing pin to inspect, save the
ones you like.

## What's new in Phase 1

- **UK criterion catalog (15 criteria)** — flood risk (EA bands), Ofsted
  primary + secondary, NHS A&E and GP access, DEFRA NO₂, DEFRA road noise,
  Ofcom broadband, TfL PTAL, council tax band, Land Registry median price,
  commute to anchor, crime (police.uk), green space, fire-rescue response.
- **Greater London seed dataset** — 4,400+ H3 cells at resolution 8 across
  the M25, with spatially coherent synthetic values that respect the
  Thames flood corridor, central commute decay, prime-area price bumps,
  and PTAL ring structure.
- **Drag-to-rank weights view** — alternative to sliders, with weights
  derived via the rank-reciprocal scheme. Tab-switchable.
- **Synthetic UK property listings** — Rightmove-style fields (tenure,
  EPC band, council tax band, square feet, days on market). 240 sample
  listings inside the M25.
- **Listings layer on the map** with price-band-sized pins.
- **Property detail panel** with per-property suitability scorecard,
  radar chart of the top contributors, EPC swatch, and a heart toggle to
  favourite.
- **Favourites + saved profile** persisted to `localStorage` so the user
  doesn't lose their work on refresh.
- **Hard-constraint editor** — explicit toggles for "must not be HIGH
  flood risk" / "council tax band ≤ F" / etc., visually separated from
  the weight sliders.
- **£ formatting** everywhere; EPC band swatches; postcode prefixes
  drawn from real London areas.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ React 18 + TypeScript + Vite                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UI shell (Tailwind + Radix)                             │   │
│  │   Top bar: search · brand · basemap · anchor · toggles   │   │
│  │   Left:  Priorities (Slider | Rank) + Hard constraints   │   │
│  │   Centre: MapLibre + deck.gl (H3 hex + listing pins)     │   │
│  │   Right: Inspect | Listings | Favourites tabs            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  State: Zustand                                                 │
│    useProfileStore   — weights, enabled, constraints (persist)  │
│    useFavouritesStore — saved listings + saved profiles         │
│    useUIStore         — selection, tabs, basemap, opacity       │
│                                                                 │
│  Math (src/lib/suitability.ts)                                  │
│    Normalised weighted linear combination over per-cell scores; │
│    cells violating any hard constraint are masked, not coloured.│
│                                                                 │
│  Data (Phase 1: static; Phase 2: API)                           │
│    src/data/london-seed.json     ~4.4k H3 cells × 15 criteria   │
│    src/data/london-listings.json 240 synthetic UK listings      │
└─────────────────────────────────────────────────────────────────┘
```

## Source layout

```
src/
  components/
    layout/       TopBar (incl. search stub)
    map/          MapView, Legend, ListingsToggle, basemap styles
    panels/       LayerPanel (left)
                  ├─ PresetPicker
                  ├─ SliderView      (per-criterion sliders)
                  ├─ RankView        (dnd-kit drag-to-rank)
                  ├─ HardConstraints (categorical exclusions)
                  ResultsPanel (right, tabbed)
                  ├─ ExplanationCard  (selected cell)
                  ├─ PropertyDetail   (selected listing)
                  ├─ ListingsList     (ranked listings)
                  └─ RankedList       (top cells fallback)
    ui/           Slider, Checkbox, IconButton
  data/
    london-seed.json       static H3 dataset
    london-listings.json   static UK listings
    loader.ts              accessor + cell↔h3 lookup
  lib/
    catalog.ts             15 UK criterion definitions + 5 presets
    suitability.ts         runtime WLC + constraint masking
    standardize.ts         shared raw→0..100 transform
    listings.ts            per-property suitability + price banding
    colorRamp.ts           Viridis sampler
    types.ts               domain types
    utils.ts               cn(), formatGBP(), epcColor(), formatRaw()
  state/
    useProfileStore.ts     persisted profile
    useFavoritesStore.ts   persisted favourites + saved profiles
    useUIStore.ts          ephemeral UI
scripts/
  generate-london-seed.ts      deterministic synthetic London dataset
  generate-london-listings.ts  synthetic Rightmove-style listings
docs/
  data-sources-uk.md       upstream sources + fair-housing guardrails
```

## Suitability engine

Each H3 cell carries a standardised 0..100 score per criterion (pre-baked
by the seed generator using the same transforms the runtime expects).
On every priority change, the client runs:

```
weights w (UI 0..10)  →  normalised so Σ w_i = 1 (over enabled criteria)

for each cell c:
  if c violates any hard constraint  →  score(c) = null  (masked)
  else                               →  score(c) = Σ_i w_i · s_i(c)
```

For 4,400 cells × 15 criteria this is well under 2 ms in plain JS — no
debouncing required, the heatmap redraws within a single frame of any
slider move.

## Cartographic guardrails

- Suitability ramp is **Viridis** (perceptually uniform, colour-blind safe).
- Cells that fail a hard constraint are **transparent**, not coloured low —
  "ineligible" ≠ "low score".
- The **explanation** always accompanies the score — never the score alone.
- Demographic data **never feeds the WLC** (Equality Act guardrail).

## Roadmap

- Phase 0 (`phase-0-scaffold`) — Austin demo, 6 criteria, proved the UX.
- **Phase 1 (this branch)** — UK / Greater London, 15 criteria, listings,
  favourites, drag-to-rank, profile persistence.
- Phase 2 — real data pipeline (FEMA → EA, Ofsted, NHS, DEFRA, Ofcom, TfL),
  TanStack Query against `/api/v1`, geocoding, MLS / portal partnership
  for real listings, multi-metro expansion (Manchester, Birmingham,
  Bristol, Edinburgh).
- Phase 3 — Tauri desktop wrapper, offline cache, AHP weight derivation,
  sensitivity analysis, collaborative profiles for couples.

See `docs/data-sources-uk.md` for the per-criterion data plan.

## Licence

TBD.
