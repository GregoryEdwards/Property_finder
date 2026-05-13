/**
 * Region data loader — async, region-aware.
 *
 * Phase 1.1 moves seed JSON out of the JS bundle and serves it as static
 * assets from /public/data/regions/. This lets us add regions without
 * inflating the initial bundle, and lets the browser cache them per-region.
 *
 * We use TanStack Query for caching + revalidation so each region's data
 * is fetched at most once per session and the React layer gets clean
 * loading / error states.
 *
 * Phase 2 swaps these fetches for `/api/v1/regions/<id>/cells` and
 * `/api/v1/regions/<id>/listings` against the backend — the React-side
 * interface stays the same.
 */
import { useQuery } from '@tanstack/react-query'
import { REGIONS_BY_ID } from '@/lib/regions'
import type { CellScores, Listing, SeedFile } from '@/lib/types'

interface ListingsFile {
  version: number
  generatedAt: string
  region: string
  count: number
  listings: Listing[]
}

/** Fetch helper that decodes JSON and surfaces useful errors. */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

/** Cells for a given region. */
export function useRegionCells(regionId: string) {
  const meta = REGIONS_BY_ID[regionId]
  return useQuery({
    queryKey: ['cells', regionId],
    queryFn: () => fetchJson<SeedFile>(meta!.cellsUrl),
    enabled: !!meta,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  })
}

/** Listings for a given region. */
export function useRegionListings(regionId: string) {
  const meta = REGIONS_BY_ID[regionId]
  return useQuery({
    queryKey: ['listings', regionId],
    queryFn: () => fetchJson<ListingsFile>(meta!.listingsUrl),
    enabled: !!meta,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  })
}

/** Build an H3 → cell lookup for fast point-in-cell joins. */
export function buildCellsByH3(cells: CellScores[]): Map<string, CellScores> {
  const m = new Map<string, CellScores>()
  for (const c of cells) m.set(c.h3, c)
  return m
}
