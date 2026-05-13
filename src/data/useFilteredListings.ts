/**
 * Filter + sort listings against the user's discovery filters.
 *
 * Single hook so memoisation is consistent for both the ListingsList and any
 * future callers (e.g. a numeric badge on the Listings tab).
 *
 * Performance note: the filter is O(listings) and runs on every keystroke
 * or slider move. At ~250 listings per region this is a sub-millisecond
 * pass — no debouncing needed. If we ever ship >5k listings per region,
 * promote `useFilteredListings` to a Web Worker or pre-index by H3 parent
 * cell for viewport intersection.
 */
import { useMemo } from 'react'
import type { CellSuitability, Listing } from '@/lib/types'
import { useFavouritesStore } from '@/state/useFavoritesStore'
import { useListingsFilterStore } from '@/state/useListingsFilterStore'

const EPC_ORDER: Record<Listing['epc'], number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
}

interface Args {
  listings: Listing[]
  resultsByH3: Map<string, CellSuitability>
  /** When true, also intersect with favourites set (used by the Favourites tab). */
  onlyFavourites?: boolean
  /** Caller can override the limit; default 50. */
  limit?: number
}

interface FilteredResult {
  rows: Array<{ listing: Listing; result: CellSuitability }>
  totalMatched: number
}

export function useFilteredListings({
  listings,
  resultsByH3,
  onlyFavourites,
  limit = 50,
}: Args): FilteredResult {
  const f = useListingsFilterStore()
  const favouriteListingIds = useFavouritesStore((s) => s.favouriteListingIds)

  return useMemo(() => {
    const favSet = onlyFavourites ? new Set(favouriteListingIds) : null
    const postcode = f.postcodeQuery.trim().toUpperCase()
    const minEpcRank = f.minEpc ? EPC_ORDER[f.minEpc] : null
    const useViewport = f.viewportOnly && f.currentViewport
    const v = f.currentViewport

    const matched: Array<{ listing: Listing; result: CellSuitability }> = []
    for (const listing of listings) {
      const result = resultsByH3.get(listing.h3)
      if (!result || result.score === null) continue
      if (favSet && !favSet.has(listing.id)) continue
      if (f.minPrice != null && listing.price < f.minPrice) continue
      if (f.maxPrice != null && listing.price > f.maxPrice) continue
      if (f.minBeds != null && listing.beds < f.minBeds) continue
      if (f.maxBeds != null && listing.beds > f.maxBeds) continue
      if (minEpcRank !== null && EPC_ORDER[listing.epc] > minEpcRank) continue
      if (f.propertyTypes.size && !f.propertyTypes.has(listing.propertyType)) continue
      if (f.tenures.size && !f.tenures.has(listing.tenure)) continue
      if (postcode && !listing.postcode.toUpperCase().startsWith(postcode)) continue
      if (useViewport && v) {
        if (
          listing.lng < v.west ||
          listing.lng > v.east ||
          listing.lat < v.south ||
          listing.lat > v.north
        ) {
          continue
        }
      }
      matched.push({ listing, result })
    }

    // Sort in-place. Sort cost dominated by the comparator allocations,
    // not the comparison work, so a typed switch is fine.
    matched.sort((a, b) => {
      switch (f.sort) {
        case 'suitability_desc':
          return (b.result.score ?? 0) - (a.result.score ?? 0)
        case 'price_asc':
          return a.listing.price - b.listing.price
        case 'price_desc':
          return b.listing.price - a.listing.price
        case 'beds_desc':
          return b.listing.beds - a.listing.beds
        case 'newest':
          return a.listing.daysOnMarket - b.listing.daysOnMarket
        case 'days_on_market_asc':
          return a.listing.daysOnMarket - b.listing.daysOnMarket
      }
    })

    return {
      rows: matched.slice(0, limit),
      totalMatched: matched.length,
    }
  }, [
    listings,
    resultsByH3,
    onlyFavourites,
    favouriteListingIds,
    f.sort,
    f.postcodeQuery,
    f.minPrice,
    f.maxPrice,
    f.minBeds,
    f.maxBeds,
    f.minEpc,
    f.propertyTypes,
    f.tenures,
    f.viewportOnly,
    f.currentViewport,
    limit,
  ])
}
