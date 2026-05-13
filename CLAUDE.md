# CLAUDE.md — HomeSite / Property_finder

You are working in **HomeSite**, a GIS multi-criteria suitability tool for UK
house hunters. Two regions today (Greater London, West Midlands); 18 criteria.
This file is the daily-driver brief. Detailed docs live in `docs/` and
procedural recipes in `.claude/skills/`.

## Commands

```bash
npm install                 # one-time
npm run dev                 # http://localhost:5173 (Vite)
npm run build               # tsc -b && vite build  ← run before every commit
npm run lint                # eslint
npm run seed                # regenerate both regions' cells + listings
npm run seed:london         # only London cells + listings
npm run seed:wm             # only West Midlands cells + listings
npm run seed:cells:london   # only the cell grid
npm run seed:listings:wm    # only the WM listings (depends on cells JSON)
```

There is **no test runner** yet. The safety net is `npx tsc -b` + `npx vite build`.
Run both before committing. If you add tests, propose Vitest + React Testing Library
in `docs/TESTING.md` and update this file.

## Project structure

```
src/
  App.tsx                  router shell (/, /methodology, /methodology/:id)
  MapApp.tsx               three-column map workspace
  components/
    layout/                TopBar, RegionPicker
    map/                   MapView, basemaps, Legend, ListingsToggle, MapLoadingOverlay
    panels/                LayerPanel (left), ResultsPanel (right) + children
                           ListingsFilterBar (sort/price/beds/EPC/type/tenure/viewport)
                           PropertyDetail's PortalCtas carries the Street
                           View card + Rightmove/Zoopla/OTM links
                           Pinned tab: PinnedList / PinnedDetail / AddPinnedForm
    util/                  ErrorBoundary (class-based subtree guard)
    map/                   MapView, basemaps, PinDropToggle, ListingsToggle,
                           MapHoverTip (hex hover score preview), Legend, …
    methodology/           MethodologyIndex, CriterionDetailPage, MethodologyLayout
    ui/                    Slider, Switch, Checkbox, IconButton  ← reuse before adding
  data/                    loader.ts (TanStack Query hooks), useActiveRegionData
                           useFilteredListings (filter+sort+viewport pass)
  lib/
    catalog.ts             18 criterion definitions + 5 persona presets
    methodology.ts         authored prose + cited sources per criterion
    regions.ts             region registry + regionForCoords helper
    suitability.ts         normalised WLC + hard-constraint masking
    standardize.ts         shared raw → 0..100 transform (seed + runtime)
    listings.ts            per-property suitability + price banding +
                           resolveListingPortals() runtime fallback
    listingPhotos.ts       curated Unsplash photo catalog + photosForSeed()
    propertyUrl.ts         Rightmove search URL builder + AGENT_POOL
    geocode.ts             postcodes.io lookup + reverse-lookup
    colorRamp.ts           Viridis sampler (color-blind safe)
    types.ts               domain types
    utils.ts               cn(), formatGBP(), epcColor(), formatRaw()
  state/                   Zustand stores (Profile + UI + Region +
                           Favourites + ListingsFilter + Pinned)
                           + useNormalizedWeights() hook
public/data/regions/       region seed JSON (lazy fetched at runtime)
scripts/                   per-region seed generators + shared listings factory
docs/                      ARCHITECTURE, CONVENTIONS, TESTING, data-sources-uk
.claude/skills/            procedural recipes (add-criterion, add-region, release-pr)
```

## Hard rules

- **Always create a new branch + PR. Never push directly to `main`.** Claude Code's
  auto-mode classifier blocks direct pushes to `main` for changes of any meaningful
  size — that is the intended behaviour, not a bug to work around.
- **`docs/CONVENTIONS.md` is the source of truth on style.** When in doubt, look there
  before guessing.
- **Demographic data never feeds the WLC.** Equality Act / fair-housing guardrail.
  Demographic layers may be *displayed* but `defaultEnabled: false` for the WLC and
  must never appear in `defaultHardConstraint`.
- **TypeScript strict, no `any`.** Use the existing types in `src/lib/types.ts`.
  Add to that file when extending the domain.
- **Run `npx tsc -b` and `npx vite build` before every commit.** Both must pass.
- **Cells failing a hard constraint render transparent, not low-score.** "Ineligible"
  ≠ "low score." Preserve that distinction in any new constraint UI.
- **Always show explanation alongside score.** The contribution breakdown is the
  trust mechanism — never show the composite without it.

## Tech stack

- **React 18 + TypeScript strict + Vite 5** (no Next.js; SPA on a Vite dev server).
- **MapLibre GL** basemap, **deck.gl 9** overlays (H3HexagonLayer + ScatterplotLayer).
- **h3-js** for hex indexing (resolution 8 across both regions).
- **react-map-gl/maplibre** for the MapLibre React wrapper.
- **Zustand 5** for state. `persist` middleware on Profile / Favourites / Region stores.
- **TanStack Query 5** for async region data; staleTime `Infinity` per session.
- **react-router-dom 6** for routing; static-host SPA fallback in `public/_redirects`.
- **Tailwind CSS 3** with tokens declared in `tailwind.config.js`. Don't hardcode colors.
- **Radix UI** for accessible primitives (slider, popover, tabs, tooltip).
- **dnd-kit** for drag-to-rank.
- **recharts** for the per-property radar chart.
- **lucide-react** for icons. Stay within this set — don't add new icon libs.
- **Node 20+ / npm 11+**. Scripts use `tsx` for TS execution.

## Key patterns

- **Per-cell standardised scores**: every H3 cell carries a 0..100 score per criterion,
  pre-computed by the seed generator using `src/lib/standardize.ts`. Runtime is a
  weighted sum, sub-millisecond for ~9k cells.
- **Region registry** (`src/lib/regions.ts`): adding a region is a registry entry
  + a seed script. Data is fetched lazily from `/data/regions/<id>.{cells,listings}.json`,
  not bundled. The initial JS payload does not grow when you add a region.
- **Methodology pairs every criterion**: when you add a criterion to `catalog.ts`,
  you *must* also add a `CriterionMethodology` entry to `lib/methodology.ts`.
- **Seed scripts share the standardiser**: `scripts/generate-*-seed.ts` import
  `standardize()` from `src/lib/standardize.ts` so seed-time and runtime never drift.
- **Listings have real outbound URLs**: each synthetic listing's `portals`
  object holds six real outbound URLs — Rightmove for-sale + Rightmove sold
  prices + Zoopla + OnTheMarket + Google Maps + Google Street View at the
  actual coordinates. Photos are *example* picks from a curated Unsplash CC0
  catalog and labelled as such.
- **Street View deep-link, not an embedded map**: the inspect panel
  ships a prominent "View on Google Street View" card on PropertyDetail.
  No embedded map (Phase 1.5 iframe and Phase 1.5.1 MapLibre versions
  both reverted — see `docs/LISTINGS.md` §6 for the history). The main
  map flying to the listing on selection covers the "show me where this
  is" need.
- **`resolveListingPortals(listing)`**: always read `portals` through this
  helper in `src/lib/listings.ts`. It returns `listing.portals` if present
  and otherwise rebuilds the URLs at runtime from lat/lng/postcode/price/
  beds, so stale-cached listing JSON (pre-Phase-1.4) never crashes.
- **ErrorBoundary**: any third-party-prone subtree (PropertyDetail in
  particular) should be wrapped in `@/components/util/ErrorBoundary` so a
  failure becomes a recoverable error UI rather than a blank panel.
- **Pinned properties** (user-added homes the buyer found elsewhere) live
  in their own subsystem, parallel to listings. The data is in
  `usePinnedStore` (persisted to localStorage), region-tagged and
  H3-indexed at save time so scoring is `resultsByH3.get(pin.h3)`. Two
  entry paths: postcode lookup (postcodes.io) or click-to-pin on the
  map. See `docs/PINNED.md` for the full subsystem.
- **Scoring transparency** (Phase 1.7): every CriterionRow has a clear
  Switch (include / exclude from the score), a live "X%" chip showing
  its normalised share, and a Solo button that zeros every other
  weight. ExplanationCard spells out the formula
  `weight % × cell score = contribution` per row plus an expandable
  "How this is calculated" explainer. MapView shows a hover tooltip
  over hex cells. LayerPanel exposes a "Highlight top zones above N"
  threshold slider that dims cells below the threshold.
- **`useNormalizedWeights()`**: hook in `src/state/` that returns the
  live normalised weight vector — use it anywhere you need to display
  "this criterion is contributing X% to the composite". Single source
  of truth; thin wrapper over `normalizeWeights` from suitability.ts.
- **Synthetic-listing disclosure**: PropertyDetail's banner makes the
  "demo listing" framing explicit, and the CTA labels read as searches
  ("Find real listings on Rightmove") rather than portal names. See
  `docs/LISTINGS.md` §5.

## Procedural recipes (skills)

Common multi-step changes are documented as skills — read these before doing the
work, they're written to be self-contained:

- `.claude/skills/add-criterion/SKILL.md` — add a new criterion (catalog + presets +
  seed generators + methodology).
- `.claude/skills/add-region/SKILL.md` — add a new metro / region.
- `.claude/skills/work-with-listings/SKILL.md` — change anything in the
  listings stack (new filter, new field, photo catalog edits, URL builder).
- `.claude/skills/work-with-pinned-properties/SKILL.md` — change anything
  in the user-pinned-properties stack (add a field, swap geocoder, tweak
  pin visuals, add a real-portal URL).
- `.claude/skills/release-pr/SKILL.md` — pre-PR checklist.

## Gotchas

- **Windows + git-bash**: CRLF warnings on `git add` are harmless. Don't change
  `core.autocrlf`.
- **`generatedAt` drift**: `npm run seed` rewrites the JSON with a fresh timestamp.
  If your diff shows only timestamp changes, you don't need to commit it.
- **Seed JSON is large** (~4 MB raw per region). Static-host gzip cuts that to
  ~700 KB on the wire. Don't try to inline these via `import` — that's what
  Phase 1.1 deliberately stopped doing.
- **TanStack Query** wraps the app in `src/main.tsx`. Components consume via
  `useActiveRegionData()` rather than rolling their own fetches.
- **`@/` import alias** points to `src/`. Use it; don't use relative `../../` past
  one level.
- **Direct push to `main` is blocked** by the Claude Code classifier. Always branch.

## Personal scratch + global notes

- `CLAUDE.local.md` is gitignored; use it for machine-specific notes (your local
  paths, scratch findings, debugging hunches).
- `~/.claude/CLAUDE.md` is the user's global file across all projects, not
  managed here.
