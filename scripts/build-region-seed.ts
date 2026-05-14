/**
 * Combine per-criterion processed ingest outputs into the region SeedFile.
 *
 * For each migrated criterion (a JSON file under
 * `scripts/data/processed/<region>/<criterion>.json`), overwrite the cell's
 * `raw[criterionId]` with the real value and re-standardise the score. All
 * unmigrated criteria pass through untouched, so the runtime UI keeps
 * working while the migration is in flight.
 *
 * Usage:
 *   tsx scripts/build-region-seed.ts --region=greater-london
 *
 * The combiner is idempotent and deterministic given the same inputs; safe
 * to run from CI.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CRITERIA_BY_ID } from '../src/lib/catalog'
import { standardize } from '../src/lib/standardize'
import type {
  CriterionProvenance,
  H3Index,
  SeedFile,
} from '../src/lib/types'
import { loadRegion, processedDirFor } from './ingest/lib/region'
import type { RawValue } from './ingest/lib/types'

interface ProcessedFile {
  criterionId: string
  fetchedAt: string
  sourceName: string
  sourceUrl: string
  version?: string
  values: Record<H3Index, RawValue>
}

function parseArgs(argv: string[]): { regionId: string } {
  for (const a of argv.slice(2)) {
    if (a.startsWith('--region=')) return { regionId: a.slice('--region='.length) }
  }
  throw new Error('Usage: build-region-seed --region=<id>')
}

function loadProcessedFiles(dir: string): ProcessedFile[] {
  if (!existsSync(dir)) return []
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  return files.map((f) => {
    const raw = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as ProcessedFile
    if (!raw.criterionId || !raw.values) {
      throw new Error(`Malformed processed file: ${f}`)
    }
    return raw
  })
}

function main() {
  const { regionId } = parseArgs(process.argv)
  const region = loadRegion(regionId)
  const dir = processedDirFor(regionId)
  const processed = loadProcessedFiles(dir)

  if (processed.length === 0) {
    console.log(
      `No processed criteria for region "${regionId}" at ${dir}. ` +
        `Run an ingestor first (e.g. tsx scripts/ingest/median-price.ts --region=${regionId}).`,
    )
    process.exitCode = 1
    return
  }

  const seed = JSON.parse(readFileSync(region.cellsJsonPath, 'utf8')) as SeedFile
  const provenance: Record<string, CriterionProvenance> = { ...(seed.provenance ?? {}) }

  for (const file of processed) {
    const criterion = CRITERIA_BY_ID[file.criterionId]
    if (!criterion) {
      console.warn(
        `Skipping ${file.criterionId}: not in catalog. Did you misspell the id?`,
      )
      continue
    }
    let touched = 0
    for (const cell of seed.cells) {
      const v = file.values[cell.h3]
      if (v === undefined) continue
      cell.raw[criterion.id] = v
      cell.scores[criterion.id] = Math.round(
        standardize(v, criterion.transform, criterion.direction),
      )
      touched += 1
    }
    provenance[criterion.id] = {
      kind: 'real',
      sourceName: file.sourceName,
      sourceUrl: file.sourceUrl,
      fetchedAt: file.fetchedAt,
      version: file.version,
    }
    console.log(
      `  ${criterion.id}: updated ${touched}/${seed.cells.length} cells from ${file.sourceName}`,
    )
  }

  const next: SeedFile = {
    ...seed,
    generatedAt: new Date().toISOString(),
    provenance,
  }

  writeFileSync(region.cellsJsonPath, JSON.stringify(next))
  console.log(`Wrote ${region.cellsJsonPath}`)
}

main()
