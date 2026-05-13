/**
 * Shared types for the ingestion pipeline.
 *
 * Every ingestor reads upstream data and produces a per-cell value of either
 * `number` or `string`, mirroring the shape of the existing `CellScores.raw`
 * field. The combiner then runs each cell's raw value through the catalog's
 * `standardize()` transform to produce the 0..100 score.
 */
import type { BBox, CriterionId, CriterionProvenance, H3Index } from '../../../src/lib/types'

export type RawValue = number | string

/** A criterion ingestor's per-cell output. */
export type RawByCell = Record<H3Index, RawValue>

/** Options passed to every ingestor. */
export interface IngestOptions {
  regionId: string
  /** H3 cells to populate. Sourced from the existing SeedFile so a partial
   *  ingest only computes cells the region actually contains. */
  h3Cells: H3Index[]
  /** H3 resolution used for point → cell assignment. Must match `h3Cells`. */
  h3Resolution: number
  bbox: BBox
  /** Where to write `<criterion>.json` (caller-managed). */
  outDir: string
  /** When true, ingestors may fall back to bundled fixtures instead of
   *  performing real network downloads. Useful in CI and unit tests. */
  useFixtures?: boolean
  /** Override "now" for deterministic trailing-window filtering in tests. */
  today?: Date
}

export interface IngestResult {
  criterionId: CriterionId
  count: number
  outPath: string
  provenance: CriterionProvenance
}
