# Pinned properties

User-added property locations — homes the buyer found on Rightmove,
Zoopla, OnTheMarket, or anywhere else — overlaid on the suitability
map and scored by the same engine that ranks listings and cells.

This is the surface that turns HomeSite from a synthetic demo into
something a real house-hunter would actually use: paste a postcode,
see where it scores against your weight profile, decide whether the
property is worth a viewing.

---

## 1. Lifecycle

```
   User input            usePinnedStore          MapView + ResultsPanel
  ──────────────         ──────────────          ─────────────────────
  Type postcode  ─────►  add({ name,            • ScatterplotLayer
                                lat, lng,         (violet, larger)
                                ... })          • Pinned tab
                              │                 • PinnedDetail w/
                              ▼                   scorecard
                         derives at save time:
                         • h3 (latLngToCell, res 8)
                         • regionId (regionForCoords)
                         • addedAt / updatedAt
                              │
                              ▼
                        localStorage persist
                        homesite.pinned.v1
```

Two entry paths share the same form (`AddPinnedForm`):

1. **Postcode lookup** — postcodes.io `GET /postcodes/<pc>`
   returns lat/lng + canonical postcode. No API key.
2. **Click-to-pin** — `PinDropToggle` enters pin-drop mode, the next
   map click writes `useUIStore.pendingPinDrop`, the AddPinnedForm
   auto-opens with the coordinate pre-filled, and we reverse-look-up
   the nearest postcode via postcodes.io `GET /postcodes?lat=…&lon=…`
   as a suggested default.

---

## 2. Data model

`src/lib/types.ts` defines `PinnedProperty`:

| Field | Notes |
|---|---|
| `id` | `crypto.randomUUID()` at save time (falls back to a non-secure id). |
| `name` | User-given short label. Required. |
| `lat`, `lng` | From postcode geocoding or the map click. |
| `h3` | `latLngToCell(lat, lng, 8)` — same H3 resolution as the seed grid, so scoring is `resultsByH3.get(pin.h3)`. |
| `regionId` | From `regionForCoords(lat, lng)`. Null if outside any supported region. |
| `postcode` | Either typed or reverse-looked-up. Optional. |
| `externalUrl` | Rightmove / Zoopla / OTM URL the user pasted. |
| `price`, `beds`, `propertyType` | Optional metadata. |
| `notes` | Free text. |
| `addedAt`, `updatedAt` | ISO 8601. |

`portals` is *not* stored on pins — the URLs are built on demand in
`PinnedDetail` via the same `rightmoveSearchUrl` /
`rightmoveSoldPricesUrl` / `googleMapsUrl` / `googleStreetViewUrl`
builders that listings use. Pins only carry data the user provided.

---

## 3. State

`src/state/usePinnedStore.ts` is a small Zustand store with the
`persist` middleware writing to `localStorage` (`homesite.pinned.v1`):

```ts
{
  pins: PinnedProperty[]
  add(input):   computes h3 + regionId + ids/timestamps
  update(id, patch): refreshes updatedAt; recomputes geo if coords changed
  remove(id)
  clear()
}
```

`useUIStore` adds three pin-related fields:

- `selectedPinnedId` — drives PinnedDetail + the map fly-to + the pin
  highlight.
- `pinDropMode` — true while waiting for the user's map click; flips the
  cursor to crosshair and short-circuits the click handler.
- `pendingPinDrop` — `{lat, lng}` written by MapView's click handler,
  consumed (and cleared) by AddPinnedForm.

---

## 4. Suitability scoring

A pin's score is **its cell's score**. Same WLC engine, no new math:

```ts
const result = pin.h3 ? resultsByH3.get(pin.h3) : null
```

A pin inherits everything the cell carries — the composite, the ranked
contributions, the hard-constraint masking. If the user's profile masks
the cell, the pin shows the "Cell excluded" state.

Pins outside the active region get `score = null` and a region badge
in the list ("In West Midlands — switch") so the user can flip region
to see the score.

---

## 5. UI surfaces

### 5.1 Pinned tab in `ResultsPanel`

Fourth tab, right of Favourites. Renders one of three views:

- **List** (`PinnedList`) — default. Sorted by suitability descending
  within the active region; pins in other regions fall to the bottom
  with a clickable region-switch chip.
- **Detail** (`PinnedDetail`) — when a pin is selected. Edit / remove
  + Street View + comparable-listing CTAs + scorecard.
- **Add form** (`AddPinnedForm`) — when the user clicks "Add pin" or
  completes a map drop.

### 5.2 Map layer

A second `ScatterplotLayer` (`id: 'pinned-properties'`) drawn *above*
the listings layer. Visually distinct: violet fill (`rgb(167,100,220)`),
larger radius (7 / 10 px), thicker outline. Selected pin pops to accent
yellow with a wider stroke.

### 5.3 Pin-drop toggle

`PinDropToggle` is a floating bottom-right button stacked above
`ListingsToggle`. Toggling it:

- Sets `pinDropMode = true`
- Switches the right panel to the Pinned tab
- Changes the map cursor to crosshair
- Shows a top-of-map hint banner ("Click anywhere on the map to drop a pin")

The next `onClick` on DeckGL (a click *not* on a pickable object, or
on a hex/listing/pin — doesn't matter, the mode short-circuits the
selection logic) captures `info.coordinate`, writes `pendingPinDrop`,
and exits the mode. `AddPinnedForm` picks up the pending coords on
its next render and reverse-looks up a postcode.

---

## 6. Postcodes.io

`src/lib/geocode.ts` wraps two endpoints:

| Function | Endpoint | Purpose |
|---|---|---|
| `lookupPostcode(input)` | `GET /postcodes/{postcode}` | Forward — postcode → lat/lng + canonical form. |
| `reverseLookupPostcode(lat, lng)` | `GET /postcodes?lat=…&lon=…&limit=1` | Reverse — coordinates → nearest postcode (used after a map drop). |

Both return `null` on any failure (network, 404, malformed). The form
shows a clean error message and the user can retry.

No API key, no quota friction. If we ever hammer the endpoint, add
localStorage caching keyed on canonical postcode.

---

## 7. Region tagging

`src/lib/regions.ts#regionForCoords(lat, lng)` runs at save time and
returns the first region whose bbox contains the coordinate (regions
are ordered by priority). The pin's `regionId` is stable from that
point — even if the user later edits coordinates, `update()` recomputes
both `h3` and `regionId`.

Pins outside any region's bbox keep `regionId: null`. The list shows
"outside supported regions" and the scorecard is masked.

---

## 8. Reading pinned data in components

Pattern across the app:

```ts
const pins = usePinnedStore((s) => s.pins)
const activeRegionId = useRegionStore((s) => s.activeRegionId)
const pinsInRegion = pins.filter((p) => p.regionId === activeRegionId)
```

Map layer filters to active region; list shows all pins (with region
badges); detail allows region-switch.

---

## 9. Phase 2 outlook

- **Share / sync** — currently pins are device-local. Phase 2 syncs
  to a user account so they survive a clear-storage event and can be
  viewed from a second device.
- **Photos** — let the user attach a photo URL (or upload).
- **Compare view** — multi-select pins for a side-by-side suitability
  comparison (similar to the planned listings comparison view).
- **Auto-import from Rightmove URL** — parse a Rightmove listing URL
  on paste to pull the postcode + beds + price automatically.
- **Pin clustering** — when a user has > 50 pins in one area, cluster
  them on the map.
