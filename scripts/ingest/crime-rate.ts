/**
 * crime_rate ingestor — data.police.uk street-level crime data.
 *
 * Source:
 *   https://data.police.uk/data/
 *
 * Police forces publish monthly CSVs (one per force, per month, per category
 * file: -street, -outcomes, -stop-and-search). We only consume the
 * `-street.csv` files. Real columns we use:
 *   - Month     (yyyy-mm)
 *   - Longitude (WGS84)
 *   - Latitude  (WGS84)
 *
 * Pipeline:
 *   1. Load the police.uk CSV (fixture by default; POLICE_UK_CSV_PATH env to
 *      use real data — typically a concatenation of all *-street.csv files
 *      from the trailing 12 months across the forces that cover the region).
 *   2. Filter rows to the trailing 12-month window and to lat/lng inside the
 *      region's allowed H3 cell set.
 *   3. Count crimes per cell at the region's H3 resolution.
 *   4. Normalise per 1,000 residents using the region's per-cell population
 *      from `population.ts` (uniform-density v1 — documented limitation).
 *
 * Caveat: police.uk anonymises crime locations to "snap points" (typically
 * near road centroids and public-place landmarks). High-volume snap points
 * therefore over-attribute to specific cells. This is a known property of
 * the source and we ship it unmodified — users see the same numbers police.uk
 * itself publishes.
 *
 * Usage:
 *   tsx scripts/ingest/crime-rate.ts --region=greater-london [--fixtures]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { groupPointsByH3, type PointValue } from './lib/h3-aggregate'
import { populationPerCell } from './lib/population'
import { loadRegion, processedDirFor, repoRoot } from './lib/region'
import type { IngestOptions, IngestResult, RawByCell } from './lib/types'

const CRITERION_ID = 'crime_rate'
const SOURCE_NAME = 'data.police.uk Street-level Crime Data'
const SOURCE_URL = 'https://data.police.uk/data/'
const TRAILING_WINDOW_MONTHS = 12
const FIXTURE_PATH = resolve(
  repoRoot(),
  'scripts',
  'ingest',
  'fixtures',
  'police-uk-sample.csv',
)

interface PoliceUkRow {
  month: string // 'yyyy-mm'
  lat: number
  lng: number
}

/** police.uk CSVs are standard RFC-4180 quoted CSV. Minimal splitter
 *  identical to the one used by the median_price ingestor. */
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

function parsePoliceUk(csv: string): PoliceUkRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const monthIdx = header.indexOf('month')
  const lngIdx = header.indexOf('longitude')
  const latIdx = header.indexOf('latitude')
  if (monthIdx < 0 || lngIdx < 0 || latIdx < 0) {
    throw new Error(
      `police.uk CSV missing required columns. Got: ${header.join(', ')}`,
    )
  }
  const out: PoliceUkRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const month = cols[monthIdx]?.trim()
    const lat = Number(cols[latIdx])
    const lng = Number(cols[lngIdx])
    if (!/^\d{4}-\d{2}$/.test(month ?? '')) continue
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    out.push({ month, lat, lng })
  }
  return out
}

function inTrailingMonthsWindow(
  monthIso: string,
  today: Date,
  months: number,
): boolean {
  const [y, m] = monthIso.split('-').map(Number)
  if (!y || !m) return false
  const d = Date.UTC(y, m - 1, 1)
  const cutoff = new Date(today)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  return d >= cutoff.getTime() && d <= today.getTime()
}

export async function ingest(opts: IngestOptions): Promise<IngestResult> {
  const realPath = process.env.POLICE_UK_CSV_PATH
  const usingReal = !opts.useFixtures && realPath && existsSync(realPath)
  const path = usingReal ? (realPath as string) : FIXTURE_PATH
  if (!existsSync(path)) {
    throw new Error(
      `crime_rate ingestor: no police.uk CSV at ${path}. ` +
        `Set POLICE_UK_CSV_PATH or place a fixture at ${FIXTURE_PATH}.`,
    )
  }
  const csv = readFileSync(path, 'utf8')
  const rows = parsePoliceUk(csv)

  const today = opts.today ?? new Date()
  const allowed = new Set(opts.h3Cells)
  const points: PointValue[] = []
  for (const row of rows) {
    if (!inTrailingMonthsWindow(row.month, today, TRAILING_WINDOW_MONTHS)) continue
    points.push({ lat: row.lat, lng: row.lng, value: 1 })
  }

  const grouped = groupPointsByH3(points, opts.h3Resolution, allowed)
  const cellCountForDenominator = opts.regionCellCount ?? opts.h3Cells.length
  const popPerCell = populationPerCell(opts.regionId, cellCountForDenominator)

  const values: RawByCell = {}
  for (const cell of opts.h3Cells) {
    const count = grouped.get(cell)?.length ?? 0
    if (count === 0) {
      // Real zero is meaningful: still emit it so the cell gets a high score
      // from the catalog's fuzzy_decay (less is better) transform.
      values[cell] = 0
      continue
    }
    const rate = popPerCell > 0 ? (count * 1000) / popPerCell : 0
    values[cell] = Math.round(rate * 10) / 10
  }

  mkdirSync(opts.outDir, { recursive: true })
  const outPath = resolve(opts.outDir, `${CRITERION_ID}.json`)
  const payload = {
    criterionId: CRITERION_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    version: usingReal
      ? 'data.police.uk (live download)'
      : 'data.police.uk (bundled fixture)',
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
  if (!regionId) throw new Error('Usage: crime-rate --region=<id> [--fixtures]')
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
const invokedDirectly = process.argv[1]?.endsWith('crime-rate.ts')
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

