/**
 * Build outbound Rightmove search URLs for synthetic listings.
 *
 * The goal is not to pretend a synthetic listing is real — it isn't —
 * but to land the user on **real comparable Rightmove listings** so the
 * demo feels useful. Click "View on Rightmove" and you'll land on a page
 * showing actual properties for sale in the right postcode area at the
 * right price band.
 *
 * Rightmove's location-identifier system is internal (POSTCODE^<id> ints
 * keyed by their backend). The `searchLocation` parameter on
 * `find.html` accepts a free-text location and lets Rightmove resolve
 * to the canonical location identifier server-side, so we use that.
 *
 * Phase 2 will swap this for direct deep-links to specific Rightmove
 * listings once a portal partnership exists.
 */

interface BuildUrlOpts {
  postcode: string
  price: number
  beds: number
}

/**
 * Construct a Rightmove search URL. Filters by postcode + price ±10% +
 * exact bed count. Returns a URL string safe to use in `<a href="…">`.
 */
export function rightmoveSearchUrl(opts: BuildUrlOpts): string {
  // Use the postcode district (first half of the postcode) to broaden the
  // search — full postcode often returns zero listings for streets without
  // current activity.
  const district = opts.postcode.split(/\s+/)[0]
  const minPrice = Math.max(50_000, Math.round((opts.price * 0.9) / 5000) * 5000)
  const maxPrice = Math.round((opts.price * 1.1) / 5000) * 5000
  const params = new URLSearchParams({
    searchType: 'SALE',
    searchLocation: district,
    minBedrooms: String(opts.beds),
    maxBedrooms: String(opts.beds),
    minPrice: String(minPrice),
    maxPrice: String(maxPrice),
  })
  return `https://www.rightmove.co.uk/property-for-sale/find.html?${params.toString()}`
}

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
