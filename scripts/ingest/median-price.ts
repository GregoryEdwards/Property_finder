/**
 * median_price ingestor — HM Land Registry Price Paid Data (PPD).
 *
 * Source:
 *   https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads
 *
 * PPD ships as monthly CSVs (no header row in the official file; we expect a
 * normalised CSV in fixtures and a real download path via env var). Columns
 * we use:
 *   - Transaction ID    [0]
 *   - Price             [1]
 *   - Date of Transfer  [2]
 *   - Postcode          [3]
 *
 * Pipeline for one region:
 *   1. Load the PPD CSV (fixture by default; PPD_CSV_PATH env to use real).
 *   2. Filter to the trailing 12 months and to rows whose postcode joins to
 *      a lat/lng inside the region's cell list.
 *   3. Bin by H3 cell at the region's resolution; compute median per cell.
 *   4. Cells with <5 sales: borrow from k-ring neighbours (resolution 1 ring,
 *      simple fallback for the proof of concept).
 *   5. Emit `{criterionId, values, sourceName, sourceUrl, fetchedAt}` as
 *      JSON for the combiner to merge.
 *
 * Usage:
 *   tsx scripts/ingest/median-price.ts --region=greater-london [--fixtures]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gridDisk } from 'h3-js'
import type { H3Index } from '../../src/lib/types'
import { groupPointsByH3, median, type PointValue } from './lib/h3-aggregate'
import { loadPostcodeIndex, normalisePostcode } from './lib/onspd'
import { loadRegion, processedDirFor, repoRoot } from './lib/region'
import type { IngestOptions, IngestResult, RawByCell } from './lib/types'

const CRITERION_ID = 'median_price'
const SOURCE_NAME = 'HM Land Registry Price Paid Data'
const SOURCE_URL =
  'https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads'
const TRAILING_WINDOW_MONTHS = 12
const MIN_SALES_PER_CELL = 5
const FIXTURE_PATH = resolve(
  repoRoot(),
  'scripts',
  'ingest',
  'fixtures',
  'ppd-sample.csv',
)

interface PpdRow {
  price: number
  postcode: string
  date: string // ISO yyyy-mm-dd
}

/** PPD CSV is comma-separated and quoted; we use a minimal splitter that
 *  handles double-quoted fields (which PPD uses for every column). */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
      continue
    }
    if (ch === ',' && !inQuote) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

function parsePpd(csv: string): PpdRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0)
  const rows: PpdRow[] = []
  for (const line of lines) {
    const cols = splitCsvLine(line)
    if (cols.length < 4) continue
    const price = Number(cols[1])
    const rawDate = cols[2]
    const postcode = normalisePostcode(cols[3])
    if (!Number.isFinite(price) || price <= 0) continue
    if (!postcode) continue
    // Accept either "yyyy-mm-dd hh:mm" or just "yyyy-mm-dd".
    const date = rawDate.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    rows.push({ price, postcode, date })
  }
  return rows
}

function inTrailingWindow(dateIso: string, today: Date, months: number): boolean {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return false
  const cutoff = new Date(today)
  cutoff.setMonth(cutoff.getMonth() - months)
  return d >= cutoff && d <= today
}

/** Fill a cell with the median of its k=1 neighbours where the cell itself
 *  has <MIN_SALES_PER_CELL transactions. Simple, deterministic, good enough
 *  for the proof of concept. */
function borrowSparseFromNeighbours(
  byCell: Map<H3Index, number[]>,
  allCells: H3Index[],
): RawByCell {
  const out: RawByCell = {}
  const allSet = new Set(allCells)
  for (const cell of allCells) {
    const own = byCell.get(cell) ?? []
    if (own.length >= MIN_SALES_PER_CELL) {
      out[cell] = median(own)
      continue
    }
    const pool = [...own]
    for (const n of gridDisk(cell, 1)) {
      if (!allSet.has(n)) continue
      const ns = byCell.get(n)
      if (ns) pool.push(...ns)
    }
    if (pool.length > 0) out[cell] = median(pool)
  }
  return out
}

export async function ingest(opts: IngestOptions): Promise<IngestResult> {
  const realPath = process.env.PPD_CSV_PATH
  const usingReal = !opts.useFixtures && realPath && existsSync(realPath)
  const path = usingReal ? (realPath as string) : FIXTURE_PATH
  if (!existsSync(path)) {
    throw new Error(
      `median_price ingestor: no PPD CSV at ${path}. ` +
        `Set PPD_CSV_PATH or place a fixture at ${FIXTURE_PATH}.`,
    )
  }
  const csv = readFileSync(path, 'utf8')
  const rows = parsePpd(csv)

  const postcodes = loadPostcodeIndex({ useFixtures: opts.useFixtures })

  const today = opts.today ?? new Date()
  const allowed = new Set(opts.h3Cells)
  const points: PointValue[] = []
  for (const row of rows) {
    if (!inTrailingWindow(row.date, today, TRAILING_WINDOW_MONTHS)) continue
    const pc = postcodes.get(row.postcode)
    if (!pc) continue
    points.push({ lat: pc.lat, lng: pc.lng, value: row.price })
  }

  const grouped = groupPointsByH3(points, opts.h3Resolution, allowed)
  const values = borrowSparseFromNeighbours(grouped, opts.h3Cells)

  mkdirSync(opts.outDir, { recursive: true })
  const outPath = resolve(opts.outDir, `${CRITERION_ID}.json`)
  const payload = {
    criterionId: CRITERION_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    version: usingReal ? 'PPD (live download)' : 'PPD (bundled fixture)',
    values,
  }
  writeFileSync(outPath, JSON.stringify(payload))

  return {
    criterionId: CRITERION_ID,
    count: Object.keys(values).length,
    outPath,
    provenance: {
      kind: 'real',
      sourceName: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      fetchedAt: payload.fetchedAt,
      version: payload.version,
    },
  }
}

function parseArgs(argv: string[]): { regionId: string; useFixtures: boolean } {
  let regionId: string | undefined
  let useFixtures = false
  for (const a of argv.slice(2)) {
    if (a.startsWith('--region=')) regionId = a.slice('--region='.length)
    else if (a === '--fixtures') useFixtures = true
  }
  if (!regionId) throw new Error('Usage: median-price --region=<id> [--fixtures]')
  return { regionId, useFixtures }
}

async function main() {
  const args = parseArgs(process.argv)
  const region = loadRegion(args.regionId)
  const outDir = processedDirFor(args.regionId)
  const result = await ingest({
    regionId: args.regionId,
    h3Cells: region.h3Cells,
    h3Resolution: region.h3Resolution,
    bbox: region.bbox,
    outDir,
    useFixtures: args.useFixtures,
  })
  console.log(
    `Wrote ${result.outPath} (${result.count} cells, source: ${result.provenance.kind === 'real' ? result.provenance.sourceName : result.provenance.kind}).`,
  )
}

// Run only when invoked directly via `tsx` / `node`.
const invokedDirectly = process.argv[1]?.endsWith('median-price.ts')
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
