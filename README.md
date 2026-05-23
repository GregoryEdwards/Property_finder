# HomeSite — Property Finder

> A GIS multi-criteria decision-analysis tool for UK house hunters. Weight
> the spatial factors that matter to *you* (schools, commute, flood risk,
> A&E access, price, crime, air quality), and the app continuously surfaces
> the best zones on a map — alongside the live listings inside them.

**Phase 1.2 shipped · Phase 2 in flight · Greater London + West Midlands · 18 criteria**.
Persona presets and Rightmove-style listings tuned for the UK property
market. Two launch regions today (Greater London, West Midlands
conurbation); adding more is a registry entry + a seed generator — the
runtime fetches each region's data on demand from `/data/regions/*`
rather than bundling it. Every criterion has a documented methodology
page citing real upstream sources, publication cadence, and dates.

Phase 2 has begun migrating criteria from synthetic seed data to real
upstream sources, one criterion at a time. Three criteria are live so
far: `median_price` (HM Land Registry), `crime_rate` (data.police.uk),
and `broadband_speed` (Ofcom Connected Nations). See
`docs/ingestion-pipeline.md`.

---

## Quick start

```bash
npm install
npm run seed           # regenerate the London + WM synthetic seeds
npm run dev            # http://localhost:5173
npm test               # vitest (covers standardize + Phase 2 ingestors)
npm run build          # tsc + vite production build
```

Move the priority sliders or drag-to-rank on the left, watch the heatmap
redraw in real time, click a hex or a listing pin to inspect, save the
ones you like.

## What's new

### Phase 2 (in flight on `claude/audit-data-sources-zyKNr`)
- **Real-data ingestion pipeline.** Per‑criterion ingestors under
  `scripts/ingest/<criterion>.ts` produce `Record<h3, raw>` JSON; the
  combiner `scripts/build-region-seed.ts` merges them into the existing
  `SeedFile` and re‑runs `standardize()`. Unmigrated criteria pass
  through untouched, so the app keeps working while migration is in
  progress. Full details in `docs/ingestion-pipeline.md`.
- **Three criteria migrated** so far:
  - `median_price` — HM Land Registry Price Paid Data (Phase 2.0).
  - `crime_rate` — data.police.uk street-level CSV with a uniform
    per‑cell population denominator v1 (Phase 2.1).
  - `broadband_speed` — Ofcom Connected Nations postcode‑level CSV
    (Phase 2.2).
- **`SeedFile.provenance`** — new optional `Record<CriterionId, CriterionProvenance>`
  field discriminated on `kind: 'real' | 'synthetic'`. Source URL,
  fetched timestamp, and version are persisted alongside each migrated
  criterion.
- **First tests in the repo** via `vitest`. 14 passing across
  `standardize` transforms and each migrated ingestor.

### Phase 1.2
- **Nature & countryside access** — a new criterion distinct from local
  green space. Drive-time to substantial nature: woodland ≥ 50 ha, NNRs,
  country parks, AONB / National Park. London draws on Epping Forest,
  Hampstead Heath, Richmond Park, the Chilterns AONB, etc.; West Midlands
  draws on Sutton Park, Cannock Chase AONB, Lickey Hills, Clent Hills,
  Wyre Forest, and (further afield) the southern Peak District and
  northern Cotswolds AONB.
- **Methodology section** — full prose page per criterion at
  `/methodology/<id>` with cited real sources (URL, publisher, licence,
  cadence, latest known publication), the synthetic estimation method,
  and any caveats. An ⓘ link on every priority row deep-links straight
  in; a Methodology nav button lives in the top bar.
- **Routing** introduced via react-router-dom v6. Static-host SPA
  fallback configured in `public/_redirects`.

### Phase 1.1
- **Multi-region architecture.** Seed JSON moved out of the JS bundle and
  served from `/public/data/regions/<id>.cells.json` (+ `.listings.json`).
  TanStack Query fetches per-region data once per session and caches it.
  Result: initial JS payload **dropped from ~3.3 MB → ~140 KB**, and
  adding a new region no longer inflates the bundle.
- **Region picker** in the top bar. Map flies smoothly to the new anchor;
  selections from the previous region are cleared.
- **West Midlands** as a second launch region (~5,000 H3 cells covering
  Birmingham, Wolverhampton, Walsall, Dudley, Sandwell, Solihull,
  Coventry). Spatial signal baked in for the Tame/Cole/Stour flood
  corridors, M6/M5/M42 noise + NO₂, central commute decay from Birmingham
  New Street, Solihull / Sutton Coldfield affluence bias.
- **Two new criteria**:
  - **Median annual salary** (ONS ASHE; more is better, linear £22k–£75k).
  - **Gym / leisure centre access** (walk minutes, fuzzy decay).
- **Active region store** persisted to `localStorage`.

### Phase 1
- **UK criterion catalog** — flood risk (EA bands), Ofsted primary + secondary,
  NHS A&E and GP access, DEFRA NO₂, DEFRA road noise, Ofcom broadband,
  TfL PTAL, council tax band, Land Registry median price, commute to
  anchor, crime (police.uk), green space, fire-rescue response.
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
│  Data (Phase 1.1: static assets, fetched per region)            │
│    public/data/regions/<id>.cells.json     fetched on switch    │
│    public/data/regions/<id>.listings.json  fetched on switch    │
│    Cache: TanStack Query (staleTime: Infinity per session)      │
│                                                                 │
│  Phase 2 ingestion (offline pipeline)                           │
│    scripts/ingest/<criterion>.ts  →  Record<h3, raw> JSON       │
│    scripts/build-region-seed.ts   →  merges into SeedFile +     │
│                                       writes provenance block.  │
│    Static JSON is unchanged shape; UI keeps working.            │
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
    loader.ts              TanStack Query hooks per region (cells + listings)
    useActiveRegionData.ts composite hook used by Map and ResultsPanel
  lib/
    catalog.ts             18 UK criterion definitions + 5 presets
    regions.ts             multi-region registry (London + West Midlands)
    suitability.ts         runtime WLC + constraint masking
    standardize.ts         shared raw→0..100 transform
    methodology.ts         long-form per-criterion methodology + sources
    listings.ts            per-property suitability + price banding
    colorRamp.ts           Viridis sampler
    types.ts               domain types (incl. SeedFile.provenance)
    utils.ts               cn(), formatGBP(), epcColor(), formatRaw()
  state/
    useProfileStore.ts     persisted profile
    useFavoritesStore.ts   persisted favourites + saved profiles
    useRegionStore.ts      persisted active region id
    useUIStore.ts          ephemeral UI
public/
  data/regions/
    greater-london.cells.json    + .listings.json
    west-midlands.cells.json     + .listings.json
scripts/
  generate-london-seed.ts        + listings    (Phase 1 synthetic)
  generate-west-midlands-seed.ts + listings    (Phase 1 synthetic)
  lib/listings-generator.ts      shared synthetic-listings factory
  build-region-seed.ts           Phase 2 combiner
  ingest/                        Phase 2 per-criterion real-data ingestors
    median-price.ts              HM Land Registry PPD
    crime-rate.ts                data.police.uk
    broadband-speed.ts           Ofcom Connected Nations
    lib/                         shared ingest utilities
    fixtures/                    bundled CSV samples for tests + CI
  data/                          gitignored: raw downloads + processed outputs
docs/
  data-sources-uk.md       upstream sources + fair-housing guardrails
  ingestion-pipeline.md    Phase 2 ingestion contract + cookbook
CLAUDE.md                  conventions for AI coding sessions
vitest.config.ts           test framework wiring
.env.example               env vars for real-data ingestion overrides
```

### Adding a new region

1. Write `scripts/generate-<id>-seed.ts` modeled on the WM script. Output
   to `public/data/regions/<id>.cells.json`.
2. Write `scripts/generate-<id>-listings.ts` using
   `scripts/lib/listings-generator.ts`.
3. Add an entry to `REGIONS` in `src/lib/regions.ts`.

The region picker, async loader, and map auto-recenter pick the new
region up automatically. The initial bundle does **not** grow because
region data is fetched only when the region is activated.

### Adding a new real-data ingestor

See `docs/ingestion-pipeline.md` for the full cookbook. Short version:

1. Create `scripts/ingest/<criterion>.ts` modelled on the closest
   existing ingestor (`median-price.ts` for postcode-CSV + median,
   `crime-rate.ts` for lat/lng + ratio, `broadband-speed.ts` for
   postcode-CSV + max).
2. Add a fixture under `scripts/ingest/fixtures/<source>-sample.csv`.
3. Add a unit test `scripts/ingest/<criterion>.test.ts`.
4. Wire `npm run ingest:<criterion>` in `package.json` and document the
   override env var in `.env.example`.
5. Run `npm test`, then `npm run ingest:<criterion> -- --region=greater-london --fixtures`,
   then `npm run build-seed:london` to verify end-to-end.

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

For ~4,400 London cells × 18 criteria this is well under 2 ms in plain
JS — no debouncing required, the heatmap redraws within a single frame
of any slider move.

## Cartographic guardrails

- Suitability ramp is **Viridis** (perceptually uniform, colour-blind safe).
- Cells that fail a hard constraint are **transparent**, not coloured low —
  "ineligible" ≠ "low score".
- The **explanation** always accompanies the score — never the score alone.
- Demographic data **never feeds the WLC** (Equality Act guardrail).

## Roadmap

- Phase 0 (`phase-0-scaffold`) — Austin demo, 6 criteria, proved the UX.
- Phase 1 — UK / Greater London, 15 criteria, listings, favourites,
  drag-to-rank, profile persistence.
- Phase 1.1 — Multi-region (London + West Midlands), +2 criteria, async
  per-region loader.
- Phase 1.2 — `nature_access` criterion, per-criterion methodology
  pages, react-router-dom routing.
- **Phase 2 (in flight)** — real-data ingestion pipeline; per-criterion
  ingestors that swap synthetic seed data for cited real upstreams (EA,
  Ofsted, NHS, DEFRA, Ofcom, TfL, ONS, police.uk, HM Land Registry).
  3 / 18 criteria migrated so far. See `docs/ingestion-pipeline.md`.
- Phase 3 — Tauri desktop wrapper, offline cache, AHP weight derivation,
  sensitivity analysis, collaborative profiles for couples.

See `docs/data-sources-uk.md` for the per-criterion data plan and
`docs/ingestion-pipeline.md` for how ingestors are built.

## Licence

TBD.
