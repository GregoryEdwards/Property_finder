---
name: work-with-pinned-properties
description: Use when the user asks to change anything in the pinned-properties stack — adding a field to the PinnedProperty shape, tweaking the add-pin form, changing how pins render on the map, adding bulk-import or compare views, or extending the geocoding helper. The full subsystem is described in docs/PINNED.md; this skill is the action checklist.
---

# Working with pinned properties

Pinned properties are *user-owned data* — added via postcode lookup or
map click, stored in localStorage, scored by the same WLC engine that
ranks listings. Always read `docs/PINNED.md` before reaching for this
skill: the design rationale lives there.

---

## Where things live

| Concern | File |
|---|---|
| Domain type | `src/lib/types.ts` (the `PinnedProperty` interface) |
| Geocoding helpers (postcodes.io) | `src/lib/geocode.ts` |
| Region tagging at save time | `src/lib/regions.ts#regionForCoords` |
| Persisted CRUD store | `src/state/usePinnedStore.ts` |
| Selection + pin-drop mode | `src/state/useUIStore.ts` (`selectedPinnedId`, `pinDropMode`, `pendingPinDrop`) |
| Add form (postcode + manual + metadata) | `src/components/panels/AddPinnedForm.tsx` |
| Ranked list view | `src/components/panels/PinnedList.tsx` |
| Editable detail view + scorecard | `src/components/panels/PinnedDetail.tsx` |
| Right-panel tab wiring | `src/components/panels/ResultsPanel.tsx` |
| Map layer (violet `ScatterplotLayer`) | `src/components/map/MapView.tsx` |
| Pin-drop toggle button | `src/components/map/PinDropToggle.tsx` |
| Region-change cleanup | `src/MapApp.tsx` (clears `selectedPinnedId` + `pinDropMode`) |

---

## Recipes

### Adding a new field to `PinnedProperty`

1. Add the field to the `PinnedProperty` interface in `src/lib/types.ts`.
   Mark it optional unless every user must always supply it.
2. Add an input to `AddPinnedForm.tsx` and thread it through the `addPin`
   call in `handleSave`.
3. Surface it (display + edit) in `PinnedDetail.tsx`.
4. If `usePinnedStore.update` should recompute anything when the new
   field changes, extend the update function. (Today the only such
   trigger is `lat / lng` → `h3 + regionId` recompute.)
5. **Bump the persist version**: the store key is `homesite.pinned.v1`.
   If the shape change is breaking, bump to `v2` and add a `migrate`
   handler. Adding optional fields is non-breaking.

### Adding a new "drop on map" entry point

The mechanism is in two pieces:
- `useUIStore.pinDropMode` — a flag the MapView click handler checks
- `useUIStore.pendingPinDrop` — a `{lat, lng}` envelope the form picks up

To add another entry point (e.g. a context-menu "Pin this hex"):
1. Set `pinDropMode = true` (optional — only needed if you want the
   "click anywhere on the map" flow). For a one-shot "use this exact
   coordinate," just set `pendingPinDrop` directly and skip the mode.
2. Switch the right tab to `'pinned'` so the form is visible.
3. AddPinnedForm picks up `pendingPinDrop` in its `useEffect` and
   pre-fills.

### Changing the pin's visual

Edit the `pinned-properties` ScatterplotLayer in `MapView.tsx`. The
current style (violet fill, ~7 px radius, accent-yellow when selected,
drawn ABOVE the listings layer) is deliberate — pins must be visually
distinct from synthetic listings so the user always knows what's theirs.

If you want a real pin *icon* (teardrop SVG) instead of a circle, switch
to a `IconLayer` with an inline SVG data URL. Tradeoff: IconLayer needs
an `iconAtlas` + `iconMapping` config; ScatterplotLayer doesn't.

### Adding a real-listing portal URL to PinnedDetail

`PinnedDetail` builds its outbound URLs on demand by calling
`rightmoveSearchUrl({ postcode, price, beds })` etc. from
`src/lib/propertyUrl.ts`. To add another portal:

1. Add the URL builder to `src/lib/propertyUrl.ts`.
2. Call it in `PinnedDetail` and render a chip in the existing grid.
3. If the URL needs inputs that the pin might lack (e.g. property
   type), guard the rendering with the same `canBuild…` pattern.

### Wrapping the entire stack in ErrorBoundary

`ResultsPanel` already wraps `AddPinnedForm`, `PinnedDetail`, and
`PropertyDetail` in `ErrorBoundary` instances. Any third-party-prone
sub-tree you add (e.g. a future map embed inside PinnedDetail) should
also be wrapped — use the existing pattern.

### Caching postcodes.io results

If the geocoder starts to bottleneck (it won't at any reasonable usage
level today), add a tiny localStorage cache keyed on the canonical
postcode. Extend `src/lib/geocode.ts` with a wrapper; don't change
callers — they already handle null.

---

## Hard rules

- **The `Listing` shape and the `PinnedProperty` shape are different.**
  Don't conflate them. Listings are synthetic, region-bound, and ship
  via the seed file; pins are user-owned, region-tagged at save time,
  and live only in localStorage.
- **Region is captured at save time, not query time.** A pin's
  `regionId` is computed once, when the pin is created or its
  coordinates are edited. Don't change this — it means the list can
  group/sort by region without re-running `regionForCoords` per row.
- **`h3` is computed at save time** for the same reason.
- **The postcodes.io endpoint is public, no API key.** Keep it that
  way. If a future move to a paid geocoder is needed, the wrapper in
  `geocode.ts` is the swap point.
- **Pin URLs are built on demand from coords / postcode / price / beds**,
  not stored on the pin. Pins only carry data the user provided.

---

## Checklist for any pinned-properties change

- [ ] `PinnedProperty` type updated (if shape changed) in `src/lib/types.ts`
- [ ] `usePinnedStore` setters / update logic updated if needed
- [ ] AddPinnedForm extended for any new field
- [ ] PinnedList + PinnedDetail rendering updated
- [ ] Persist version bumped + migrated if the shape is breaking
- [ ] `docs/PINNED.md` updated (table or recipe as applicable)
- [ ] `npx tsc -b` clean
- [ ] `npx vite build` clean
