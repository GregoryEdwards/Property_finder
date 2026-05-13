/**
 * Per-property helpers.
 *
 * Phase 1 keeps things simple: a listing's score is *exactly* its cell's
 * score. Phase 2 will refine with per-property attributes that interact
 * with criteria — e.g. an EPC A flat partially offsets a poor air-quality
 * cell, a freehold counts toward investor appeal, etc.
 */
import { buildPortalUrls } from './propertyUrl'
import type {
  CellSuitability,
  Listing,
  ListingPortalUrls,
  PropertySuitability,
} from './types'

export function listingSuitability(
  listing: Listing,
  cellResult: CellSuitability | undefined,
): PropertySuitability {
  if (!cellResult) {
    return { listingId: listing.id, score: null, contributions: [] }
  }
  return {
    listingId: listing.id,
    score: cellResult.score,
    contributions: cellResult.contributions,
  }
}

/** Bucket a listing by price band — used to vary pin size on the map. */
export function priceBand(price: number): 0 | 1 | 2 | 3 | 4 {
  if (price < 400_000) return 0
  if (price < 700_000) return 1
  if (price < 1_200_000) return 2
  if (price < 2_500_000) return 3
  return 4
}

/**
 * Return the portal URLs for a listing, falling back to a runtime rebuild
 * if the listing JSON lacks them.
 *
 * Why this exists: in Phase 1.4 we introduced the `portals` shape. If a
 * user has an older listings JSON cached (browser HTTP cache, stale
 * deployment, partial regenerate), the listing arrives without `portals`
 * and any direct read like `listing.portals.googleStreetView` blows up.
 *
 * This helper rebuilds the same URLs from the listing's other fields so
 * the UI never crashes. The reconstructed URLs are identical to what the
 * seed-time generator produces — `buildPortalUrls` is the single source
 * of truth for the URL shape.
 */
export function resolveListingPortals(listing: Listing): ListingPortalUrls {
  if (listing.portals) return listing.portals
  return buildPortalUrls({
    postcode: listing.postcode,
    price: listing.price,
    beds: listing.beds,
    lat: listing.lat,
    lng: listing.lng,
  })
}
