/**
 * Composite hook returning the active region's metadata + fetched cells +
 * fetched listings, plus loading / error state.
 *
 * Two callers (MapView and ResultsPanel) need exactly this shape; the
 * composite avoids duplicating the boilerplate.
 */
import { REGIONS_BY_ID } from '@/lib/regions'
import { useRegionStore } from '@/state/useRegionStore'
import { useRegionCells, useRegionListings } from './loader'
import type { CellScores, Listing, RegionAnchor } from '@/lib/types'
import type { RegionMeta } from '@/lib/regions'

export interface ActiveRegionData {
  region: RegionMeta
  cells: CellScores[]
  listings: Listing[]
  anchor: RegionAnchor
  /** True if either dataset is fetching for the first time. */
  isLoading: boolean
  /** True if either dataset failed. */
  hasError: boolean
  /** Combined error (cells wins over listings). */
  error: Error | null
  /** Cell count for status displays — falls back to 0 while loading. */
  cellCount: number
}

const EMPTY_CELLS: CellScores[] = []
const EMPTY_LISTINGS: Listing[] = []

export function useActiveRegionData(): ActiveRegionData {
  const activeRegionId = useRegionStore((s) => s.activeRegionId)
  const region = REGIONS_BY_ID[activeRegionId] ?? Object.values(REGIONS_BY_ID)[0]
  const cellsQ = useRegionCells(region.id)
  const listingsQ = useRegionListings(region.id)

  const isLoading =
    (cellsQ.isPending && cellsQ.fetchStatus !== 'idle') ||
    (listingsQ.isPending && listingsQ.fetchStatus !== 'idle')
  const hasError = cellsQ.isError || listingsQ.isError
  const error = (cellsQ.error ?? listingsQ.error ?? null) as Error | null

  return {
    region,
    cells: cellsQ.data?.cells ?? EMPTY_CELLS,
    listings: listingsQ.data?.listings ?? EMPTY_LISTINGS,
    anchor: cellsQ.data?.anchor ?? region.anchor,
    isLoading,
    hasError,
    error,
    cellCount: cellsQ.data?.cellCount ?? 0,
  }
}
