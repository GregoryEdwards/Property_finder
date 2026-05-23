/**
 * Unit tests for the crime_rate ingestor using bundled police.uk-shape
 * fixtures.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { latLngToCell } from 'h3-js'
import { afterEach, describe, expect, it } from 'vitest'
import { ingest } from './crime-rate'
import { populationPerCell } from './lib/population'

const H3_RES = 8
const FIXED_TODAY = new Date('2026-05-13T00:00:00Z')
// London cell count from the real seed (used as the denominator regardless
// of how many cells a given test populates).
const LONDON_CELL_COUNT = 4419

function tmpOutDir(): string {
  return mkdtempSync(join(tmpdir(), 'homesite-ingest-'))
}

describe('crime_rate ingestor (fixtures)', () => {
  const tmpDirs: string[] = []
  afterEach(() => {
    while (tmpDirs.length) rmSync(tmpDirs.pop()!, { recursive: true, force: true })
  })

  it('counts crimes per cell, filters out-of-window rows, and normalises per 1k residents', async () => {
    const sw1aCell = latLngToCell(51.501, -0.1418, H3_RES)
    const trafalgarCell = latLngToCell(51.5078, -0.128, H3_RES)
    const e1Cell = latLngToCell(51.5181, -0.067, H3_RES)
    const farAwayCell = latLngToCell(60.0, 5.0, H3_RES)

    const outDir = tmpOutDir()
    tmpDirs.push(outDir)
    const result = await ingest({
      regionId: 'greater-london',
      h3Cells: [sw1aCell, trafalgarCell, e1Cell, farAwayCell],
      h3Resolution: H3_RES,
      bbox: { west: -1, south: 51, east: 1, north: 52 },
      outDir,
      useFixtures: true,
      today: FIXED_TODAY,
      regionCellCount: LONDON_CELL_COUNT,
    })

    expect(result.criterionId).toBe('crime_rate')
    expect(result.provenance.kind).toBe('real')

    const payload = JSON.parse(readFileSync(result.outPath, 'utf8'))
    expect(payload.sourceName).toBe('data.police.uk Street-level Crime Data')

    const pop = populationPerCell('greater-london', LONDON_CELL_COUNT)
    expect(pop).toBeGreaterThan(1500) // ~2014 for London

    // SW1A cell — 4 crimes in window (Buckingham Palace Road rows dated
    // 2026-04, 2026-03, 2026-03, 2026-02). The 2024-08 row is filtered.
    // The malformed-month row (2026-bad) is filtered. The empty-coord row
    // is filtered.
    const sw1aRate = Math.round((4 * 1000) / pop * 10) / 10
    expect(payload.values[sw1aCell]).toBe(sw1aRate)

    // Trafalgar Square cell — 3 crimes in window.
    const trafalgarRate = Math.round((3 * 1000) / pop * 10) / 10
    expect(payload.values[trafalgarCell]).toBe(trafalgarRate)

    // Whitechapel — 3 crimes in window.
    const e1Rate = Math.round((3 * 1000) / pop * 10) / 10
    expect(payload.values[e1Cell]).toBe(e1Rate)

    // Far-away cell still gets an entry, with value 0 (real zero, not missing).
    expect(payload.values[farAwayCell]).toBe(0)
  })

  it('uses regionCellCount as the population denominator, not h3Cells.length', async () => {
    // Pass a single cell. If the ingestor used h3Cells.length as the
    // denominator the pop per cell would be ~8.9M, making any single-crime
    // rate effectively zero. With regionCellCount=LONDON_CELL_COUNT the
    // rate matches the realistic ~2014 person denominator.
    const sw1aCell = latLngToCell(51.501, -0.1418, H3_RES)
    const outDir = tmpOutDir()
    tmpDirs.push(outDir)
    const result = await ingest({
      regionId: 'greater-london',
      h3Cells: [sw1aCell],
      h3Resolution: H3_RES,
      bbox: { west: -1, south: 51, east: 1, north: 52 },
      outDir,
      useFixtures: true,
      today: FIXED_TODAY,
      regionCellCount: LONDON_CELL_COUNT,
    })
    const payload = JSON.parse(readFileSync(result.outPath, 'utf8'))
    expect(payload.values[sw1aCell]).toBeGreaterThan(0.5)
  })
})
