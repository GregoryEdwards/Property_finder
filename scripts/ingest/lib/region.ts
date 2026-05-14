/**
 * Region helpers for ingestors.
 *
 * Each ingestor needs the list of H3 cells and the bbox it should populate.
 * We source both from the existing SeedFile rather than re-deriving from the
 * region registry, so per-criterion ingestion always matches the cell layout
 * the UI will consume.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REGIONS_BY_ID } from '../../../src/lib/regions'
import type { BBox, H3Index, SeedFile } from '../../../src/lib/types'

const HERE = resolve(fileURLToPath(import.meta.url), '..')
const REPO_ROOT = resolve(HERE, '..', '..', '..')

export interface RegionInfo {
  regionId: string
  bbox: BBox
  h3Resolution: number
  h3Cells: H3Index[]
  cellsJsonPath: string
}

export function loadRegion(regionId: string): RegionInfo {
  const meta = REGIONS_BY_ID[regionId]
  if (!meta) {
    throw new Error(
      `Unknown region "${regionId}". Known: ${Object.keys(REGIONS_BY_ID).join(', ')}`,
    )
  }
  const cellsJsonPath = resolve(REPO_ROOT, 'public', meta.cellsUrl.replace(/^\//, ''))
  const seed = JSON.parse(readFileSync(cellsJsonPath, 'utf8')) as SeedFile
  return {
    regionId,
    bbox: seed.bbox,
    h3Resolution: seed.h3Resolution,
    h3Cells: seed.cells.map((c) => c.h3),
    cellsJsonPath,
  }
}

export function processedDirFor(regionId: string): string {
  return resolve(REPO_ROOT, 'scripts', 'data', 'processed', regionId)
}

export function rawCacheDir(): string {
  return resolve(REPO_ROOT, 'scripts', 'data', 'raw')
}

export function repoRoot(): string {
  return REPO_ROOT
}
