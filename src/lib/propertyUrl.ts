/**
 * Outbound URL builders for synthetic listings.
 *
 * We can't ship real portal photos for a property that doesn't exist, but
 * we *can* — and do — direct the user to the real-world surfaces where
 * actual listings, sold-price comparables, and real photography of the
 * actual street live.
 *
 * Every URL here is built at seed time, baked into the listings JSON,
 * and rendered as a portal-CTA row on PropertyDetail.
 *
 * Coverage:
 *   - Rightmove for-sale search (current listings, postcode+beds+price band)
 *   - Rightmove house-prices (real sold prices for the postcode district —
 *     a useful comparable view alongside for-sale)
 *   - Zoopla for-sale search
 *   - OnTheMarket for-sale search
 *   - Google Maps (opens the actual coordinates)
 *   - Google Street View (opens *real* street imagery at the coordinates,
 *     no API key required — uses the documented Maps URL API)
 *
 * Hard rule (see docs/LISTINGS.md): these URLs must land on a *useful real
 * page* even though the listing is synthetic. Don't add a CTA that 404s or
 * lands on an irrelevant search.
 */

interface BuildUrlOpts {
  postcode: string
  price: number
  beds: number
}

interface CoordOpts {
  lat: number
  lng: number
}

/** Postcode district (the first half) — e.g. "SW1A" from "SW1A 1AA". */
function district(postcode: string): string {
  return postcode.split(/\s+/)[0]
}

function priceBand(price: number): { min: number; max: number } {
  return {
    min: Math.max(50_000, Math.round((price * 0.9) / 5000) * 5000),
    max: Math.round((price * 1.1) / 5000) * 5000,
  }
}

/**
 * Rightmove for-sale search. Filters postcode district + bed count +
 * price ±10%. `searchLocation` is the public-facing parameter on
 * find.html; Rightmove resolves it to their internal locationIdentifier
 * server-side.
 */
export function rightmoveSearchUrl(opts: BuildUrlOpts): string {
  const { min, max } = priceBand(opts.price)
  const params = new URLSearchParams({
    searchType: 'SALE',
    searchLocation: district(opts.postcode),
    minBedrooms: String(opts.beds),
    maxBedrooms: String(opts.beds),
    minPrice: String(min),
    maxPrice: String(max),
    radius: '0.0',
  })
  return `https://www.rightmove.co.uk/property-for-sale/find.html?${params.toString()}`
}

/**
 * Rightmove sold-prices page for the postcode district — the single most
 * useful real-world page for a buyer trying to triangulate value.
 * Pattern: /house-prices/<DISTRICT>.html (works for major UK districts).
 */
export function rightmoveSoldPricesUrl(opts: { postcode: string }): string {
  return `https://www.rightmove.co.uk/house-prices/${encodeURIComponent(district(opts.postcode))}.html`
}

/**
 * Zoopla for-sale search. URL pattern uses lowercase postcode districts.
 * Zoopla accepts `price_min` / `price_max` / `beds_min` / `beds_max`
 * directly as query params.
 */
export function zooplaSearchUrl(opts: BuildUrlOpts): string {
  const { min, max } = priceBand(opts.price)
  const params = new URLSearchParams({
    price_min: String(min),
    price_max: String(max),
    beds_min: String(opts.beds),
    beds_max: String(opts.beds),
  })
  return `https://www.zoopla.co.uk/for-sale/property/${district(opts.postcode).toLowerCase()}/?${params.toString()}`
}

/**
 * OnTheMarket for-sale search. URL pattern uses lowercase postcode
 * district. OTM is the third-largest UK portal — useful to surface
 * listings that aren't on Rightmove or Zoopla.
 */
export function onTheMarketUrl(opts: { postcode: string }): string {
  return `https://www.onthemarket.com/for-sale/property/${district(opts.postcode).toLowerCase()}/`
}

/**
 * Google Maps deep-link at the actual property coordinates.
 *
 * Uses the documented Maps URL API:
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * No API key required — these URLs are designed for public use.
 */
export function googleMapsUrl({ lat, lng }: CoordOpts): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/**
 * Google Street View deep-link at the actual property coordinates.
 * Opens the panorama (`map_action=pano`) viewer pointed at the
 * coordinate.
 *
 * This is the closest we get to "accurate photos" for a synthetic
 * listing: the street view is real imagery of the real street the
 * coordinate sits on.
 */
export function googleStreetViewUrl({ lat, lng }: CoordOpts): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
}

/**
 * Build all the portal URLs for a listing in one call.
 * Returns a shape that can be JSON-serialised straight into a Listing.
 */
export function buildPortalUrls(
  opts: BuildUrlOpts & CoordOpts,
): {
  rightmoveSearch: string
  rightmoveSoldPrices: string
  zooplaSearch: string
  onTheMarket: string
  googleMaps: string
  googleStreetView: string
} {
  return {
    rightmoveSearch: rightmoveSearchUrl(opts),
    rightmoveSoldPrices: rightmoveSoldPricesUrl(opts),
    zooplaSearch: zooplaSearchUrl(opts),
    onTheMarket: onTheMarketUrl(opts),
    googleMaps: googleMapsUrl(opts),
    googleStreetView: googleStreetViewUrl(opts),
  }
}

// ─── Synthetic UK agencies ─────────────────────────────────────────────

/**
 * Synthetic UK agency names. Drawn at seed time. Distribution mixes
 * local-feeling small agencies with two or three larger national-style
 * names — matches the actual UK market mix.
 *
 * NB: These are *invented* — not real agency names. Phase 2 swaps for
 * the real agent attached to each Rightmove listing.
 */
export const AGENT_POOL: string[] = [
  'Bramley & Co',
  'Hartfield Residential',
  'Linwood Estate Agents',
  'Mercer & Hawthorn',
  'Northam Property',
  'Oak & Sterling',
  'Penbridge Estates',
  'Rowan & Vine',
  'Sandford Homes',
  'Tilbury Property Group',
  'Vale & Marlow',
  'Westbury Residential',
  'York & Crescent',
  'Aldermere Property',
  'Beaumont & Co',
  'Cedarwood Estates',
  'Drayton Property',
  'Eastfield & Sons',
]
