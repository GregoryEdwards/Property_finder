---
name: work-with-listings
description: Use whenever the user asks to change anything in the listings stack — adding a filter, adding a Listing field, changing the photo catalog, changing the outbound URL builder, expanding listing counts, or adjusting how listings render. The full subsystem is described in docs/LISTINGS.md; this skill is the action checklist.
---

# Working in the listings stack

The listings stack spans seed-time generation, per-region storage, runtime
fetching, filtering, sorting, and two display surfaces. Most changes touch
two or three of these layers; the rest take care of themselves.

**Always read `docs/LISTINGS.md` first.** It carries the design rationale
and the per-field contract.

---

## Where things live

| Concern | File |
|---|---|
| Domain type | `src/lib/types.ts` (the `Listing` interface) |
| Seed-time generation | `scripts/lib/listings-generator.ts` (shared factory) |
| Per-region seed scripts | `scripts/generate-<id>-listings.ts` |
| Photo catalog | `src/lib/listingPhotos.ts` |
| Outbound URL builder + agent pool | `src/lib/propertyUrl.ts` |
| Per-region JSON output | `public/data/regions/<id>.listings.json` |
| Runtime fetch (TanStack Query) | `src/data/loader.ts` (`useRegionListings`) |
| Composite hook (cells + listings) | `src/data/useActiveRegionData.ts` |
| Filter / sort / viewport intersection | `src/data/useFilteredListings.ts` |
| Filter state (persisted) | `src/state/useListingsFilterStore.ts` |
| Filter bar UI | `src/components/panels/ListingsFilterBar.tsx` |
| List UI | `src/components/panels/ListingsList.tsx` |
| Property detail UI | `src/components/panels/PropertyDetail.tsx` |
| Map pin layer | `src/components/map/MapView.tsx` (`ScatterplotLayer 'listings'`) |
| Viewport publish to filter store | `MapView` `useEffect` on `viewState` change |

---

## Recipes

### Adding a new `Listing` field

1. Extend the `Listing` interface in `src/lib/types.ts`.
2. Populate it in `scripts/lib/listings-generator.ts` (inside the per-listing
   loop). Use the existing PRNG `rand` for any randomness.
3. Regenerate: `npm run seed:listings:london && npm run seed:listings:wm`
   (or `npm run seed` if cells also change).
4. Display it on `PropertyDetail.tsx` and/or `ListingsList.tsx`.
5. If it's filterable, see "Adding a new filter" below.

### Adding a new filter

1. Add the field + setter to `src/state/useListingsFilterStore.ts`. Include
   it in `partialize` so persistence works.
2. Add the predicate to `useFilteredListings` *before* the sort. Add the
   field to the hook's `useMemo` dependency list.
3. Add the UI surface to `ListingsFilterBar.tsx` — chip / range / select
   following the existing patterns. Bump the active-count badge logic if the
   filter is binary.
4. No changes to `ListingsList` are needed — it reads the filtered output.

### Adding a new sort option

1. Add to the `SortKey` union in `useListingsFilterStore`.
2. Add the case to the `switch (f.sort)` block in `useFilteredListings`.
3. Add an entry to `SORT_OPTIONS` in `ListingsFilterBar`.

### Changing the photo catalog

1. Edit `src/lib/listingPhotos.ts`. Adding entries is safe.
2. Removing entries is fine but **regenerate the seeds** afterwards — the
   `photoSeed % length` mapping shifts. Run `npm run seed`.
3. If you change `photosForSeed`'s signature, update the call site in
   `scripts/lib/listings-generator.ts`.

### Changing the outbound URL builder

1. Edit `src/lib/propertyUrl.ts`. Keep the return type as a string for now.
2. Regenerate seeds: `npm run seed:listings:london && npm run seed:listings:wm`.
3. If you add new URL-affecting fields (e.g. property type into the URL),
   thread them through `BuildUrlOpts` and the call site.

### Adding a new region's listings

See `.claude/skills/add-region/SKILL.md`. The shared factory in
`scripts/lib/listings-generator.ts` handles photos + URL + agent for you —
the region script only declares postcode tables + seed constants.

### Tweaking the viewport-bbox throttle

`MapView` throttles viewport publish to 100 ms via `lastSentRef`. If you
need more frequent updates (e.g. for a live mini-map), drop the threshold
in `MapView.tsx`. Beware: deck.gl fires viewState changes on every
animation frame, so untrottled updates spam React.

---

## Hard rules

- **Don't promise things the synthetic data can't deliver.** The
  `propertyUrl` lands on real Rightmove comparables — that's honest. Don't
  add a "Book a viewing" CTA in Phase 1 because there's nothing to book.
- **Don't add real fake addresses.** Synthetic street names + real
  postcode districts is the line; making up "123 Buckingham Palace Road"
  is a step too far.
- **Keep `photoSeed` immutable.** Even if you replace the photo catalog,
  the `photoSeed` field on each listing is the index; the catalog can change
  shape without bumping the schema.
- **The `Listing` shape is the contract** between Phase-1 synthetic and
  Phase-2 real-portal ingest. Adding optional fields is fine; renaming
  existing fields is not (you'll break the Phase-2 ingest plans documented
  in `docs/data-sources-uk.md`).

---

## Checklist for any listings change

- [ ] `Listing` type updated (if shape changed) in `src/lib/types.ts`
- [ ] Generator updated in `scripts/lib/listings-generator.ts`
- [ ] `npm run seed:listings:london` + `npm run seed:listings:wm` re-run if data shape changed
- [ ] Filter store + `useFilteredListings` updated if new filter
- [ ] `ListingsFilterBar`, `ListingsList`, or `PropertyDetail` updated as needed
- [ ] `docs/LISTINGS.md` updated (table, recipe, or phase-2 note as applicable)
- [ ] `npx tsc -b` clean
- [ ] `npx vite build` clean
