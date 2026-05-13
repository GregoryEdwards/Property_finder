/**
 * Phase 0 dataset loader.
 *
 * In Phase 1 this is replaced by a TanStack Query hook fetching from
 * `/api/v1/suitability/cells?bbox=...` and assembling per-viewport batches.
 * For Phase 0 the whole Austin metro fits in memory comfortably (~3k cells,
 * ~1 MB JSON gzipped), so we ship it as a static import.
 */
import seedRaw from './austin-seed.json'
import type { CellScores } from '@/lib/types'

interface SeedFile {
  version: number
  generatedAt: string
  metro: string
  h3Resolution: number
  bbox: { west: number; south: number; east: number; north: number }
  downtownAnchor: { lat: number; lng: number }
  cellCount: number
  cells: CellScores[]
}

export const SEED = seedRaw as unknown as SeedFile

export function getAustinCells(): CellScores[] {
  return SEED.cells
}
