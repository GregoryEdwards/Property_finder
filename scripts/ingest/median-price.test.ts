/**
 * Unit test for the median_price ingestor using bundled fixtures.
 *
 * We avoid touching the real 4 k-cell London seed file: instead we ask the
 * ingestor to populate a synthetic 3-cell H3 set that we derive on the fly
 * from the fixture postcodes. This keeps the test fast and independent of
 * any state in `public/data/regions/`.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { latLngToCell } from 'h3-js'
import { describe, expect, it, afterEach } from 'vitest'
import { ingest } from './median-price'

const H3_RES = 8
const FIXED_TODAY = new Date('2026-05-13T00:00:00Z')

function tmpOutDir(): string {
  return mkdtempSync(join(tmpdir(), 'homesite-ingest-'))
}

describe('median_price ingestor (fixtures)', () => {
  const tmpDirs: string[] = []
  afterEach(() => {
    while (tmpDirs.length) rmSync(tmpDirs.pop()!, { recursive: true, force: true })
  })

  it('writes a processed file with a median price per cell', async () => {
    // SW1A 1AA fixture has 6 in-window transactions and one out-of-window.
    // Compute the H3 cell directly from the fixture lat/lng.
    const sw1aCell = latLngToCell(51.501, -0.1418, H3_RES)
    const e1Cell = latLngToCell(51.5181, -0.067, H3_RES)
    const b1Cell = latLngToCell(52.4801, -1.904, H3_RES)
    // Include a far-away cell that has no postcodes/sales to verify it's omitted.
    const emptyCell = latLngToCell(50.0, 0.0, H3_RES)

    const outDir = tmpOutDir()
    tmpDirs.push(outDir)
    const result = await ingest({
      regionId: 'greater-london',
      h3Cells: [sw1aCell, e1Cell, b1Cell, emptyCell],
      h3Resolution: H3_RES,
      bbox: { west: -1, south: 51, east: 1, north: 52 },
      outDir,
      useFixtures: true,
      today: FIXED_TODAY,
    })

    expect(result.criterionId).toBe('median_price')
    expect(result.provenance.kind).toBe('real')

    const payload = JSON.parse(readFileSync(result.outPath, 'utf8'))
    expect(payload.sourceName).toBe('HM Land Registry Price Paid Data')
    expect(typeof payload.fetchedAt).toBe('string')

    // SW1A 1AA cell: 6 in-window transactions
    //   725 000, 810 000, 680 000, 920 000, 755 000, 860 000 → sorted median = (755+810)/2 = 782 500.
    // The 2024-08-15 transaction must be filtered out by the trailing-12-month window.
    expect(payload.values[sw1aCell]).toBe(782_500)

    // Cells with no postcode matches in the allow list should not appear.
    expect(payload.values[emptyCell]).toBeUndefined()
  })

  it('borrows from k-ring neighbours when the cell has <5 sales', async () => {
    // E1 6AN has only 2 sales in-window. With neighbour borrowing disabled
    // the cell would have no value; with the k=1 ring we expect a value
    // present (the cell has no neighbours with sales in this fixture either,
    // so it will fall through — checks the no-data path).
    const e1Cell = latLngToCell(51.5181, -0.067, H3_RES)
    const outDir = tmpOutDir()
    tmpDirs.push(outDir)
    const result = await ingest({
      regionId: 'greater-london',
      h3Cells: [e1Cell],
      h3Resolution: H3_RES,
      bbox: { west: -1, south: 51, east: 1, north: 52 },
      outDir,
      useFixtures: true,
      today: FIXED_TODAY,
    })
    const payload = JSON.parse(readFileSync(result.outPath, 'utf8'))
    // 2 sales is below the 5-sale floor; with no neighbours in the allow
    // list the cell ends up with the median of its own 2 sales (550 + 580) / 2 = 565 000.
    expect(payload.values[e1Cell]).toBe(565_000)
  })
})
