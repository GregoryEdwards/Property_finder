# Listings — discovery, photos, URLs

How the listings subsystem is shaped end-to-end, and the contract between the
seed-time generator and the runtime discovery UX.

---

## 1. Lifecycle

```
scripts/lib/listings-generator.ts   ← shared factory (postcode + price + photos + URL)
        │
        ├── generate-london-listings.ts          ← per-region postcode table
        └── generate-west-midlands-listings.ts
        │
        ▼
public/data/regions/<id>.listings.json
        │
        ▼
src/data/loader.ts                  ← TanStack Query, fetched on region switch
        │
        ▼
useActiveRegionData() → cells + listings
        │
        ├── MapView                     ← deck.gl ScatterplotLayer pins
        └── ResultsPanel
              ├── ListingsList ← uses useFilteredListings()
              └── PropertyDetail (selected listing)
```

---

## 2. The Listing schema

`src/lib/types.ts` defines `Listing`. Fields and what they mean:

| Field | Source | Notes |
|---|---|---|
| `id` | `${REGION}-NNNNN` at seed time | Stable across regenerations if the PRNG seed is unchanged. |
| `lng`, `lat`, `h3` | Sampled cell + jitter | `h3` joins the listing to its cell for inheriting the cell's suitability score. |
| `postcode` | Region's postcode-area table | The district prefix (`SW`, `B`, `CV`…) is real; the rest is synthetic. |
| `addressLine` | `<n> <streetName> <streetType>` | Synthetic. |
| `price`, `beds`, `baths`, `sqft` | Derived from cell's median price + property-type multiplier + jitter | The cell-level median anchors the price; jitter ~18%. |
| `propertyType` | Weighted pick | flat (3/8), terraced (2/8), semi (1/8), detached (1/8), maisonette (1/8). |
| `tenure` | Per type | Flats/maisonettes lean leasehold; houses lean freehold. |
| `epc` | Distribution: ~5% A, ~12% B, ~35% C, ~30% D, ~13% E, ~4% F, ~1% G | Approximates the actual UK distribution. |
| `councilTaxBand` | Inherited from cell's `council_tax` raw | Stays consistent with the cell-level affluence pattern. |
| `daysOnMarket` | 1..95 uniform | Synthetic. |
| `photos` | `photosForSeed(photoSeed, 3)` from `lib/listingPhotos.ts` | 1 hero + 3 gallery thumbnails, Unsplash CDN URLs. |
| `propertyUrl` | `rightmoveSearchUrl(...)` from `lib/propertyUrl.ts` | Outbound Rightmove search URL with postcode district + bed count + price ±10%. **Lands on real comparable listings.** |
| `agentName` | Pick from `AGENT_POOL` | Synthetic agency name. |

---

## 3. Photos

`src/lib/listingPhotos.ts` is the curated catalog. Why hand-curated rather
than generative or per-listing real-photo?

- **Determinism**: `photoSeed % photos.length` is a stable mapping.
- **Quality**: Unsplash has a wide variety of architectural photos; we picked
  ~30 across exterior, interior, kitchen, living, bedroom.
- **Stability**: Unsplash CDN URLs with photo IDs are persistent.
- **Cost**: zero — no API key, no per-request cost.
- **Licence**: Unsplash License — free for commercial use, no attribution
  required (similar to CC0).

`photosForSeed(seed, n)` returns a hero plus `n` gallery thumbnails using
prime-offset stride into the catalog so the gallery isn't four shots of the
same category. Adding photos is safe; removing an entry can shuffle which
listings get which photo, which is harmless because the next seed regen
restores a coherent pairing.

When Phase 2 lands and we have real listing feeds, each listing's `photos`
will come from the portal. The runtime code already treats `photos` as a
plain array of URLs — no code changes needed beyond the seed-generator
replacement.

---

## 4. The `propertyUrl` and the outbound CTA

Each synthetic listing carries a Rightmove search URL pre-filled with:

- `searchLocation = <postcode district>` (e.g. `SW`, `B`, `CV`)
- `minBedrooms` / `maxBedrooms = beds`
- `minPrice` / `maxPrice = price ± 10%` (rounded to nearest £5k)
- `searchType = SALE`

So clicking "View comparable on Rightmove" from `PropertyDetail` lands the
user on a **real Rightmove results page** showing genuinely-listed
properties in the postcode district at a comparable price. The demo isn't
pretending the synthetic listing is real; it's directing the user to real
comparables.

In Phase 2 with a portal partnership, `propertyUrl` will deep-link to the
specific Rightmove listing for that property. The schema doesn't change.

---

## 5. Discovery: filter / sort / search / viewport

State lives in `src/state/useListingsFilterStore.ts`. It is **persisted to
localStorage** because discovery is iterative — refreshing should not wipe
your filters.

| Filter | Default | Behaviour |
|---|---|---|
| `sort` | `suitability_desc` | Also: `price_asc`, `price_desc`, `beds_desc`, `newest`. |
| `postcodeQuery` | `''` | Case-insensitive prefix match against `listing.postcode`. |
| `minPrice`, `maxPrice` | `null` | Inclusive bounds, £. |
| `minBeds`, `maxBeds` | `null` | Inclusive bounds. |
| `minEpc` | `null` | Includes listings *at or above* the chosen band (A is best, G is worst). |
| `propertyTypes` | `Set()` | Empty means *all types*. Non-empty filters to membership. |
| `tenures` | `Set()` | Empty means *all tenures*. |
| `viewportOnly` | `false` | When on, only listings whose `lng/lat` is inside the current map viewport are shown. |
| `currentViewport` | `null` (not persisted) | Updated by `MapView` on pan/zoom, ~10 Hz throttled. |

The filter logic is in `src/data/useFilteredListings.ts` — a single hook
both the Listings and Favourites tabs consume. It returns the top-N filtered
rows *plus* the total matched count so the filter bar can show
"42 of 240 listings".

Perf budget today: ~250 listings × ~10 filter predicates per region is
sub-millisecond on every keystroke. If listings grow to >5k per region,
promote this hook to a Web Worker or pre-index by H3 parent cell for the
viewport intersection.

---

## 6. Viewport-aware filtering

The `In view only` toggle relies on a live viewport bbox that `MapView`
publishes to `useListingsFilterStore.setCurrentViewport` on every pan/zoom.
Mechanics:

1. `MapView` renders inside a `containerRef` div with a `ResizeObserver`
   tracking width/height (the side panels collapse and change the canvas
   size at runtime).
2. On every `viewState` change, we instantiate a `WebMercatorViewport`
   with the current centre + zoom + container dims and call `getBounds()`
   to obtain `[west, south, east, north]`.
3. Throttled to 100 ms — deck.gl emits viewState on every animation frame
   during a fly-to and that would spam the store.
4. The bbox is *not* persisted — only the `viewportOnly` flag is.

`useFilteredListings` reads `currentViewport` only when `viewportOnly` is
true, so the throttle isn't visible to filter results.

---

## 7. Adding a region's listings

See `.claude/skills/add-region/SKILL.md`. The factory in
`scripts/lib/listings-generator.ts` handles photos + URLs + agents
automatically; per-region scripts only declare postcode tables + seed
constants.

## 8. Adding a new filter

1. Add the field + setter to `useListingsFilterStore`.
2. Add a UI surface to `ListingsFilterBar` (chip / range / select pattern;
   see existing examples).
3. Add the predicate to `useFilteredListings` *before* the sort. Add the
   field to the `useMemo` dependency array so React invalidates.
4. Type-check + build, commit.

---

## 9. Phase 2 outlook

Once portal partnerships land:

- **Real listings**: replace the synthetic generator with a per-portal
  ingest pipeline writing the same `Listing` shape. Runtime is unchanged.
- **Real photos**: photos come from the portal; the curated catalog is
  retired (but `listingPhotos.ts` stays as a development-mode fallback).
- **Real propertyUrl**: deep-link to the specific listing, not a search.
- **Pagination**: today's 240/220 per region grows to thousands;
  `useFilteredListings` returns a fixed `limit` already — wire pagination
  through the UI.
- **Saved searches**: persist a filter set + alert when new listings hit it.
- **Mortgage affordability layer**: combine the price filter with a salary
  multiplier from `median_salary`.
