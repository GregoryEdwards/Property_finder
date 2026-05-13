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
| `photos` | `photosForSeed(photoSeed, 3)` from `lib/listingPhotos.ts` | 1 hero + 3 gallery thumbnails, Unsplash CDN URLs. **Example photos, not the property.** PropertyDetail labels this. |
| `portals` | `buildPortalUrls(...)` from `lib/propertyUrl.ts` | Six real outbound URLs — see §4 below. |
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

## 4. Multi-portal URLs (the `portals` object)

Each synthetic listing carries six real outbound URLs in a structured
`portals` field. Every URL lands on a useful real page; clicking through
shows genuine current market data even though the listing itself is
synthetic.

| Field | Lands on | Useful for |
|---|---|---|
| `portals.rightmoveSearch` | Real Rightmove for-sale results in the postcode district + bed count + price ±10% | The headline CTA — see current asking prices for *real* comparable properties. |
| `portals.rightmoveSoldPrices` | Real Rightmove sold-prices page for the postcode district | The single most useful real-world page for triangulating value. |
| `portals.zooplaSearch` | Real Zoopla for-sale results, same filters | Cross-portal sanity check; Zoopla sometimes lists what Rightmove doesn't. |
| `portals.onTheMarket` | Real OnTheMarket for-sale results | Third-largest UK portal; useful for properties not on Rightmove / Zoopla. |
| `portals.googleMaps` | Google Maps at the **actual coordinates** | See the neighbourhood at a glance. |
| `portals.googleStreetView` | Google Street View at the **actual coordinates** | **Real imagery of the actual street the listing sits on** — the closest "accurate photo" we can deliver without a portal partnership. No API key required (uses the documented Maps URL API). |

The builders in `src/lib/propertyUrl.ts`:

- `rightmoveSearchUrl({ postcode, price, beds })` — `find.html` with
  `searchLocation` (Rightmove resolves to its internal locationIdentifier
  server-side) + bed count + ±10% price band + `radius=0.0`.
- `rightmoveSoldPricesUrl({ postcode })` — `/house-prices/<district>.html`.
- `zooplaSearchUrl({ postcode, price, beds })` — `for-sale/property/<district>/`
  with `price_min/max` + `beds_min/max`.
- `onTheMarketUrl({ postcode })` — `for-sale/property/<district>/`.
- `googleMapsUrl({ lat, lng })` — `maps/search/?api=1&query=lat,lng`.
- `googleStreetViewUrl({ lat, lng })` — `maps/@?api=1&map_action=pano&viewpoint=lat,lng`.
- `buildPortalUrls(opts)` — convenience wrapper that returns the full
  object in one call. Used at seed time.

### Sourcing-clarity UX (Phase 1.5)

The earlier pain point — "the inspect tab makes it hard to source the
original listing" — turned out to be a *clarity* problem rather than a
data one. The listing isn't on Rightmove because the listing is synthetic.
PropertyDetail makes this explicit:

1. **Disclosure banner** at the very top of the panel:
   "Demo listing. This property is synthesised for the prototype. Use the
   buttons below to find real, currently-listed homes for sale at this
   postcode and price band."
2. **Headline CTA** below the location preview explicitly framed as a
   *search*: "Find real listings on Rightmove" — with a subtitle showing
   the filter parameters (e.g. "3-bed · SW1 · around £950k") so the user
   knows what they'll see when they click.
3. **Sibling portal chips** named for what they *do*: "Search on Zoopla",
   "Search on OnTheMarket", "Sold prices nearby" — instead of bare portal
   names.
4. **"Find real listings like this"** section header makes the
   "search for similar real properties" framing explicit.

### Why Street View is the cornerstone of "accurate photos"

The Unsplash photos are *examples*. They're not photos of the actual
property — they can't be; the property doesn't exist. The honest substitute
is Street View at the listing's coordinates: real imagery of the real
street. PropertyDetail surfaces this as a dedicated card (not just a chip)
so the user sees a clear path to actual photography of the place.

Phase 2 with portal partnership replaces `portals.rightmoveSearch` with a
direct deep-link to the specific listing, and `photos` with the real
listing photos.

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

## 6. Location preview (Phase 1.5.2)

This section has had three lives, in roughly equal short succession:

1. **Phase 1.5**: tabbed Google Maps / OpenStreetMap iframe embeds. Google's
   `output=embed` legacy pattern was inconsistently blocked by
   `X-Frame-Options: SAMEORIGIN` and corporate networks blocked both
   providers, producing a blank panel.
2. **Phase 1.5.1**: replaced the iframes with an inline MapLibre mini-map
   reusing the main map's basemap style. Robust, but it duplicated context
   the user could already see by virtue of the main map flying to the
   selected listing on click.
3. **Phase 1.5.2 (current)**: removed `PropertyLocationPreview` entirely.
   The inspect panel is back to the simpler Phase-1.4 layout: example
   photo + gallery, property details, then a prominent **Street View
   card** + portal CTA grid. The main map already shows the listing's
   actual area because of the fly-to behaviour, so a second embedded
   map was redundant.

### The Street View card

`PortalCtas` renders a high-contrast card at the top of the CTA cluster:

> 👁  **View on Google Street View** ↗
>     *Real imagery at 51.5074, -0.1278*

This is the visual centrepiece — the closest thing a synthetic listing
delivers to "a real photo of this place." Click and the user lands on
real Google Street View imagery at the property's actual coordinates,
no API key, no auth.

### Defensive portals fallback

The user can hit "blank panel" on listings that lack the `portals` field
— that happens when the browser has an older listings JSON in HTTP cache
from before Phase 1.4 added the structured `portals` shape.

`Listing.portals` is therefore **optional** in the type system, and
`src/lib/listings.ts#resolveListingPortals(listing)` rebuilds the URLs
from `lat / lng / postcode / price / beds` at runtime if `portals` is
missing. `PortalCtas` always calls through this helper.

Plus an `ErrorBoundary` around `PropertyDetail` (see §6.1) catches any
remaining render-time failure and shows a recoverable error UI rather
than a blank panel.

### §6.1 ErrorBoundary

`src/components/util/ErrorBoundary.tsx` is a generic class-component
boundary that captures render-time errors in its subtree and renders a
red-tinted "Something went wrong" card with a "Try again" reset.
`ResultsPanel` wraps `PropertyDetail` in it, keyed by listing id so a
new selection always remounts fresh. Use this around any subtree that
loads third-party content or potentially-stale data — see the recipe in
`.claude/skills/work-with-listings/SKILL.md`.

## 7. Fly-to on listing select

When `selectedListingId` changes, `MapView` flies the camera to the listing's
`lat / lng` with `FlyToInterpolator` at speed 1.6 and a 900 ms duration.
Minimum zoom 14 so the user always lands close enough to see the surrounding
streets.

This is the second "accurate location" mechanism: the user sees the real
street/area on the live basemap, complementing the honest-placeholder
photos and the Street View deep-link in PropertyDetail.

The effect is guarded by:
- The `selectedListingId` dependency only — region switches clear the
  selection in `App.tsx` *before* this effect runs, so a stale ID never
  causes a fly to the wrong region.
- A listing-existence check before flying (`listings.find(...)`).

## 8. Viewport-aware filtering

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

## 9. Adding a region's listings

See `.claude/skills/add-region/SKILL.md`. The factory in
`scripts/lib/listings-generator.ts` handles photos + URLs + agents
automatically; per-region scripts only declare postcode tables + seed
constants.

## 10. Adding a new filter

1. Add the field + setter to `useListingsFilterStore`.
2. Add a UI surface to `ListingsFilterBar` (chip / range / select pattern;
   see existing examples).
3. Add the predicate to `useFilteredListings` *before* the sort. Add the
   field to the `useMemo` dependency array so React invalidates.
4. Type-check + build, commit.

---

## 11. Phase 2 outlook

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
