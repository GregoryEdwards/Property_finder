/**
 * Phase 1 dataset loader.
 *
 * Static import of the Greater London cell + listings seed files. Replace
 * with TanStack Query against `/api/v1/suitability/cells` and
 * `/api/v1/listings` in Phase 2 when the backend lands.
 */
import seedRaw from './london-seed.json'
import listingsRaw from './london-listings.json'
import type { CellScores, Listing, SeedFile } from '@/lib/types'

interface ListingsFile {
  version: number
  generatedAt: string
  region: string
  count: number
  listings: Listing[]
}

export const SEED: SeedFile = seedRaw as unknown as SeedFile
export const LISTINGS_FILE: ListingsFile = listingsRaw as unknown as ListingsFile

export function getCells(): CellScores[] {
  return SEED.cells
}

export function getListings(): Listing[] {
  return LISTINGS_FILE.listings
}

/** Build an H3 → cell lookup for fast point→cell joins. */
export function getCellsByH3(): Map<string, CellScores> {
  const m = new Map<string, CellScores>()
  for (const c of SEED.cells) m.set(c.h3, c)
  return m
}
