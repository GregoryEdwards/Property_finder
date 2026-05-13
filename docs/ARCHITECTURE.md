# Architecture & key design decisions

This document is the deeper reference behind `CLAUDE.md`. Read it once when
you start working on this codebase; treat it as the source of truth on *why*
the code is shaped the way it is.

---

## 1. The product, in one paragraph

HomeSite is a multi-criteria spatial decision-support tool. A household picks
the factors they care about (schools, flood, commute, price, etc.), assigns
weights, and the map continuously surfaces the zones — and the listings inside
them — that score highest against their personal weighting. Cells that fail a
*hard constraint* (e.g. "never in a HIGH flood zone") are masked entirely
rather than coloured low. The user never sees a composite score without the
contribution breakdown — that's the trust mechanism, not a nice-to-have.

---

## 2. The suitability engine

### 2.1 H3-cell scoring, not per-pixel rasters

We score on **H3 hexagonal cells** at resolution 8 (~0.7 km²) rather than per-
pixel rasters. Trade-offs:

- ✅ Trivial runtime (a normalised weighted sum) — sub-millisecond for ~9k cells.
- ✅ O(1) lookup for "what's the score at this point" — the explanation popover
  is essentially free.
- ✅ Roll-ups to neighbourhoods / postcodes are H3 hierarchy traversals.
- ✅ Cell scores are pre-bakeable and cacheable per criterion.
- ❌ Visible hex boundaries instead of smooth gradients (acceptable at res 8;
  res 9 would smooth it further if needed).

### 2.2 Per-criterion standardisation

Every criterion has a `Transform` (`linear`, `fuzzy_decay`, `categorical`) that
maps its raw unit (£, minutes, Ofsted grade, FEMA band) to a 0..100 score. The
function lives in `src/lib/standardize.ts` and is **shared between seed-time
and runtime** so the two never drift. `defaultEnabled`, `defaultWeight`, and
`defaultHardConstraint` come from the same `CriterionDefinition` record.

### 2.3 The WLC at runtime (`src/lib/suitability.ts`)

```
weights w (UI 0..10)  →  normalised so Σ w_i = 1 (over enabled criteria)

for each cell c:
  if c violates any hard constraint  →  score(c) = null  (masked, transparent)
  else                               →  score(c) = Σ_i w_i · s_i(c)
```

That's the whole engine. The hard work is upstream (criterion definitions,
standardisation) and downstream (UX of *explanation*). Don't add complexity
to the WLC itself unless you have a concrete reason — e.g. AHP-derived
weights in a future phase replace `normalizeWeights()` only.

### 2.4 Hard constraints vs weights

These are two **visually and semantically distinct things**. Weights *bias*
the composite score; constraints *exclude* cells entirely. The UI keeps
them separated (`HardConstraints.tsx` is below the weight sliders, with its
own visual treatment). Don't merge them. If a user wants to "down-weight
strongly" they can set weight 0; if they want to *exclude* they use a
constraint.

---

## 3. Data architecture

### 3.1 Seed-then-fetch (Phase 1.1+)

- Each region's data is pre-baked offline by `scripts/generate-<region>-*.ts`
  into `public/data/regions/<id>.cells.json` and `<id>.listings.json`.
- The browser fetches each region's payload **once per session** via
  TanStack Query (`useRegionCells`, `useRegionListings` in
  `src/data/loader.ts`). `staleTime` is `Infinity` and the cache is
  retained for 30 minutes after the last consumer unmounts.
- The initial JS bundle does **not** carry region data. Adding regions has
  zero impact on first-paint cost.

### 3.2 Synthetic but spatially coherent

Phase 1 ships **synthetic** seed values. They're designed to *look*
plausible — the Thames floodway, M6 noise corridors, prime-area price
bumps, PTAL ring structure, Solihull and Sutton Coldfield affluence bias
— so the demo reads correctly to a user who knows the geography, without
shipping any licensed data.

Phase 2 will swap the synthetic generators for a real pipeline. The
catalog and the runtime engine **do not change** — only the source of the
per-cell raw values does. That separation is intentional.

### 3.3 Listings

Synthetic listings live alongside cells (`<id>.listings.json`). Each
listing's `h3` field joins it to the cell containing it; per-property
suitability is inherited from the cell.

The shared factory `scripts/lib/listings-generator.ts` takes the cell
seed, a region-specific postcode-area table, a count, and a PRNG seed,
and produces Rightmove-style records (price, beds/baths, sqft, tenure,
EPC, council tax band, days-on-market, **photos, propertyUrl, agentName**).

Each synthetic listing carries:
- a deterministic set of *example* photos from a curated Unsplash CC0 catalog
  (`src/lib/listingPhotos.ts`), surfaced in PropertyDetail with an
  "Example photo" overlay so users understand they're not photos of the
  specific property
- a `portals` object built by `src/lib/propertyUrl.ts` with six real
  outbound URLs: Rightmove for-sale, Rightmove sold prices, Zoopla,
  OnTheMarket, Google Maps, and Google Street View — all anchored to the
  listing's postcode district + bed + price band, or directly to the
  coordinates for Maps/Street View
- the map flies to the listing's coordinates on selection, giving the
  user real visual context of the actual area on the live basemap

Filter/sort/viewport discovery for listings is implemented in
`src/data/useFilteredListings.ts` (a single hook the Listings and
Favourites tabs share) backed by a persisted `useListingsFilterStore`.
See `docs/LISTINGS.md` for the full subsystem reference.

### 3.4 Region registry pattern

`src/lib/regions.ts` is a typed array of `RegionMeta`:

```ts
{ id, displayName, country, bbox, anchor, defaultZoom, cellsUrl, listingsUrl }
```

Adding a region is:
1. Write `scripts/generate-<id>-seed.ts` and `scripts/generate-<id>-listings.ts`.
2. Run `npm run seed:<id>` to write the JSON to `public/data/regions/`.
3. Add a `REGIONS` entry.

The region picker, async loader, and map fly-to all pick it up.

---

## 4. State management

Three Zustand stores plus the active region selector — small, single-purpose:

| Store | Persisted | Concern |
|---|---|---|
| `useProfileStore` | yes (localStorage) | weights, enabled, hard constraints, profile name |
| `useFavouritesStore` | yes (localStorage) | saved listings + saved profiles |
| `useRegionStore` | yes (localStorage) | active region id |
| `useUIStore` | no | selection, panel collapse, basemap, tab, opacity |

Persistence uses Zustand's `persist` middleware with versioned keys
(`homesite.profile.v1`, etc.). Migrations bump the version and add a
migration function.

The profile store is the **hot path** (every slider move). Its setters touch
only the field that changed so unrelated selectors don't re-render. If you add
a field, follow that pattern.

---

## 5. Map rendering

- **MapLibre GL** for the basemap (vector for dark/light, raster for satellite).
- **deck.gl 9** for overlays — `H3HexagonLayer` for the suitability hexes,
  `ScatterplotLayer` for property pins. Pickable; click info is dispatched in
  `MapView.handleClick` based on the picked layer's id.
- **Controlled `viewState`**: the map is rendered with `viewState`/
  `onViewStateChange`. On region change we update the view state with a
  `FlyToInterpolator` to animate the camera. We do not remount the map.
- **`updateTriggers`** on the H3 layer invalidate `getFillColor` precisely
  when `layerData` or opacity changes, and `getLineColor`/`getLineWidth`
  when the selected H3 changes. Forgetting these is the #1 cause of "map
  stops updating on slider change."
- **Color ramp** is Viridis (perceptually uniform, colour-blind safe). The
  sampler is in `src/lib/colorRamp.ts`. Don't introduce rainbow / jet.

---

## 6. Routing

- `react-router-dom` v6 with `BrowserRouter` in `src/App.tsx`.
- Three routes today: `/` (map), `/methodology` (index), `/methodology/:id`
  (per-criterion).
- Static-host SPA fallback is in `public/_redirects` (Cloudflare Pages,
  Netlify, Vercel format). Vite dev serves the fallback automatically.

---

## 7. Methodology pages (Phase 1.2)

Every criterion has an authored `CriterionMethodology` entry in
`src/lib/methodology.ts` carrying real source citations (URL, publisher,
licence, cadence, last-known publication date) plus the Phase 1
synthetic-estimation description and caveats. The detail page renders
the prose plus the transform spec from the catalog.

**Hard rule**: when you add a criterion to `catalog.ts` you *must* add a
matching `CriterionMethodology` to `methodology.ts`. The build won't fail
without it — the methodology page just won't find it. There is a `TODO`
in your future to add a unit test that asserts the two stay in sync.

---

## 8. Performance budget

Targets that the architecture is designed to meet:

| Action | Budget | Why it holds |
|---|---|---|
| Slider move → heatmap redraw | < 100 ms | WLC over ~9k cells in plain JS is sub-ms; deck.gl repaint is < 16 ms. |
| Region switch (cache hit) | < 200 ms | Cells already in memory; FlyToInterpolator runs the camera animation. |
| Region switch (cache miss) | < 2 s on broadband | ~700 KB gzipped fetch + JSON parse + first render. |
| Initial JS bundle (gzipped) | < 100 KB main + libs | Seed JSON is *not* in the bundle. |

If you regress any of these meaningfully, that's a flag — propose a fix in
the PR description.

---

## 9. Phase plan (where we are, where we're going)

- **Phase 0** (`phase-0-scaffold`): Austin demo, 6 criteria. Proved the UX.
- **Phase 1** (`phase-1-uk`): UK retarget, Greater London, 15 criteria,
  listings, drag-to-rank, favourites, hard constraints.
- **Phase 1.1** (`phase-1.1-multi-region`): runtime-fetched region data,
  West Midlands, +median salary, +gym access.
- **Phase 1.2** (`phase-1.2-methodology`): +nature access, full methodology
  pages with cited sources.
- **Phase 1.3** (`feat/listings-discovery`): listings stack overhaul —
  curated Unsplash photo catalog, Rightmove deep-link `propertyUrl`,
  filter / sort / postcode search / viewport-only toggle, photo gallery
  on PropertyDetail. See `docs/LISTINGS.md`.
- **Phase 1.4** (`feat/listings-portal-accuracy`): replace single
  `propertyUrl` with a structured `portals` object — six real outbound
  URLs (Rightmove for-sale + sold prices + Zoopla + OnTheMarket + Maps +
  Street View). Map flies to the listing on selection. Photos labelled
  "Example photo" so users see the honesty caption next to the placeholder.
- **Phase 1.5** (`feat/listings-embedded-preview`): embed the location
  as an iframe in PropertyDetail (tabbed Google Maps / OpenStreetMap,
  neither needs an API key) with a prominent Street View deep-link;
  add a synthetic-listing disclosure banner; rewrite CTA copy as
  searches ("Find real listings on Rightmove") rather than portal names
  to fix the "I can't source the actual listing" UX confusion.
- **Phase 2**: real data pipeline (EA, Ofsted, NHS, DEFRA, Ofcom, TfL,
  HMLR), backend API at `/api/v1`, geocoding, MLS / portal partnership for
  real listings, multi-metro expansion.
- **Phase 3**: Tauri desktop wrapper, offline cache, AHP weight derivation,
  sensitivity analysis, collaborative profiles.

Each phase is a branch on the repo; the spec PRs are the canonical
description.

---

## 10. Open questions / known unfinished work

- **Phase 1 listings are synthetic.** The Rightmove / Zoopla licensing path is
  Phase 2.
- **PTAL is London-only.** Outside London the criterion is computed as a
  proxy from rail/bus density. We surface the same 0–8 scale to keep the
  UX consistent but document the proxy.
- **No unit tests.** The build is the only safety net today; see
  `docs/TESTING.md` for the proposed approach.
- **PostCode/area search in the top bar is a stub.** Functionally wired in
  Phase 2 when geocoding lands.
- **Ofsted reform (Sep 2024)** replaced the single-grade headline rating;
  Phase 2 surfaces the new sub-judgements alongside historical grades.
