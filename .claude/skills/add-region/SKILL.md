---
name: add-region
description: Use when the user asks to add a new UK metro / region to HomeSite (e.g. "add Manchester", "add Bristol"). Walks through the registry entry, seed scripts, and verification steps. The runtime already supports arbitrary regions via the lazy-fetch loader — no React changes needed.
---

# Adding a new region

The runtime architecture (Phase 1.1+) was specifically designed so adding a
region is **registry entry + seed scripts**. No React work, no bundle growth.

---

## 1. Choose the bbox + anchor

Pick:

- **`id`** — kebab-case, lowercase, stable forever (`manchester`, `bristol`,
  `edinburgh`). This becomes part of the asset URL.
- **`displayName`** — what the user sees in the region picker.
- **`bbox`** — a four-corner rectangle in WGS84 covering the conurbation
  plus a small buffer. Roughly the M25-equivalent ring for the metro.
- **`anchor`** — the canonical centre point. Usually the main rail terminus
  (Birmingham New Street, Manchester Piccadilly, Bristol Temple Meads).
- **`defaultZoom`** — `10` for compact metros, `9.5` for spread conurbations,
  `10.2` for London-sized.

## 2. Author the seed generator: `scripts/generate-<id>-seed.ts`

Use `scripts/generate-west-midlands-seed.ts` as the template — it's slightly
simpler than the London one. Replace:

- The bbox constant
- The anchor coordinates
- The A&E hospitals (research the real Type-1 trauma-receiving hospitals
  in the metro)
- The arterial polylines (motorways + ring roads; rough approximations are
  fine for synthetic)
- The river polylines for flood
- The nature features (Phase 1.2+) — woodland, NNRs, country parks, AONB
  fragments inside reasonable drive of the conurbation
- The school-bias anchors (affluent corridors / commuter belts)
- The price-bump anchors (prime areas)

Every catalog criterion must have a `rawXxx()` function and an entry in the
`raw` object inside the loop.

**Output path**: `public/data/regions/<id>.cells.json`.
**Determinism**: use `mulberry32` with a per-region PRNG seed.

## 3. Author the listings generator: `scripts/generate-<id>-listings.ts`

Use `scripts/generate-west-midlands-listings.ts` as the template:

```ts
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateListings, type PostcodeArea } from './lib/listings-generator'

const POSTCODE_AREAS: PostcodeArea[] = [
  { prefix: 'M',  west: ..., south: ..., east: ..., north: ... },
  // ...
]

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

generateListings({
  seedPath: resolve(__dirname, '../public/data/regions/<id>.cells.json'),
  outPath: resolve(__dirname, '../public/data/regions/<id>.listings.json'),
  postcodeAreas: POSTCODE_AREAS,
  fallbackPostcode: '<primary>',
  count: 200,                  // adjust to metro size
  region: '<id>',
  photoSeedBase: <unique>,     // each region gets a different range
  prngSeed: <unique>,
})
```

The shared factory `scripts/lib/listings-generator.ts` does the rest.

## 4. Add npm scripts for the new region

In `package.json`:

```json
"seed:<id>": "tsx scripts/generate-<id>-seed.ts && tsx scripts/generate-<id>-listings.ts",
"seed:cells:<id>": "tsx scripts/generate-<id>-seed.ts",
"seed:listings:<id>": "tsx scripts/generate-<id>-listings.ts"
```

And extend the top-level `seed` script so the all-regions regen still does
the right thing:

```json
"seed": "npm run seed:london && npm run seed:wm && npm run seed:<id>"
```

## 5. Register the region in `src/lib/regions.ts`

Add a `RegionMeta` entry to the `REGIONS` array:

```ts
{
  id: '<id>',
  displayName: '<Display Name>',
  country: 'United Kingdom',
  bbox: { west, south, east, north },
  anchor: { name: '<terminus>', lng, lat },
  defaultZoom: <number>,
  cellsUrl: '/data/regions/<id>.cells.json',
  listingsUrl: '/data/regions/<id>.listings.json',
}
```

Order doesn't matter functionally — the region picker iterates in array
order. Group sensibly (alphabetical or by population).

## 6. Generate + verify

```bash
npm run seed:<id>
ls -lh public/data/regions/
```

Cell JSON should be ~3–5 MB raw; listings ~50–100 KB.

## 7. Smoke test

```bash
npm run dev
```

Open http://localhost:5173, switch to the new region in the dropdown. Expect:

- A loading overlay for ~1 second on first switch (the fetch).
- Map flies to the new anchor.
- Heatmap renders (move a slider to confirm WLC updates).
- Listings appear as pins; clicking one opens PropertyDetail.

## 8. Type-check + build

```bash
npx tsc -b && npx vite build
```

The new region's static JSON should appear in `dist/data/regions/` after the
build.

---

## Checklist

- [ ] `scripts/generate-<id>-seed.ts` written and runs without errors
- [ ] `scripts/generate-<id>-listings.ts` written
- [ ] `package.json` scripts added; top-level `seed` updated
- [ ] `src/lib/regions.ts` entry added
- [ ] `npm run seed:<id>` produced both JSON files in `public/data/regions/`
- [ ] Region picker shows the new entry and switching works
- [ ] `npx tsc -b` clean
- [ ] `npx vite build` clean; the JSON is in `dist/data/regions/`

---

## What you do not need to do

- ❌ Touch any React component. The map, panels, methodology pages all read
  the region from the store and the data via `useActiveRegionData()`.
- ❌ Update the listing factory (it's region-agnostic).
- ❌ Add anything to `methodology.ts` (it's per-criterion, not per-region).
- ❌ Inflate the JS bundle (you won't — region data is fetched at runtime).
