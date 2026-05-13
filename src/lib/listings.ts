/**
 * Per-property suitability — inherits the H3 cell's composite score and
 * contributions for the listing's location.
 *
 * Phase 1 keeps things simple: a listing's score is *exactly* its cell's
 * score. Phase 2 will refine with per-property attributes that interact
 * with criteria — e.g. an EPC A flat partially offsets a poor air-quality
 * cell, a freehold counts toward investor appeal, etc.
 */
import type { CellSuitability, Listing, PropertySuitability } from './types'

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
