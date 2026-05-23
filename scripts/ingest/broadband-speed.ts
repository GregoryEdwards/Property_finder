/**
 * broadband_speed ingestor — Ofcom Connected Nations postcode-level data.
 *
 * Source:
 *   https://www.ofcom.org.uk/research-and-data/multi-sector-research/infrastructure-research/connected-nations
 *
 * Ofcom publishes annual + interim CSVs of fixed broadband coverage. The
 * postcode-level file we consume is wide (many coverage breakdowns); we only
 * need two columns:
 *   - postcode               (matched case-insensitively against header)
 *   - max_download_speed_mbps (matched against header substring
 *     "max" + "download" + "speed" so real Ofcom column names like
 *     "Maximum download speed (Mbit/s)" also work without preprocessing)
 *
 * Pipeline:
 *   1. Load the Ofcom CSV (fixture by default; OFCOM_BROADBAND_CSV_PATH
 *      env to use real).
 *   2. For each row, parse the max speed and join postcode → lat/lng via
 *      ONSPD.
 *   3. Bin to H3 at the region's resolution.
 *   4. Take the max speed across postcodes in each cell — matches the
 *      catalog's "Maximum advertised download speed available at this
 *      address from any fixed provider".
 *   5. Clamp to [0, 1000] Mbps to match the catalog's linear transform.
 *
 * Usage:
 *   tsx scripts/ingest/broadband-speed.ts --region=greater-london [--fixtures]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { groupPointsByH3, max, type PointValue } from './lib/h3-aggregate'
import { loadPostcodeIndex, normalisePostcode } from './lib/onspd'
import { loadRegion, processedDirFor, repoRoot } from './lib/region'
import type { IngestOptions, IngestResult, RawByCell } from './lib/types'

const CRITERION_ID = 'broadband_speed'
const SOURCE_NAME = 'Ofcom Connected Nations (postcode-level fixed broadband)'
const SOURCE_URL =
  'https://www.ofcom.org.uk/research-and-data/multi-sector-research/infrastructure-research/connected-nations'
const SPEED_CLAMP_MIN = 0
const SPEED_CLAMP_MAX = 1000
const FIXTURE_PATH = resolve(
  repoRoot(),
  'scripts',
  'ingest',
  'fixtures',
  'ofcom-broadband-sample.csv',
)

interface OfcomRow {
  postcode: string
  maxMbps: number
}

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

/** Best-effort column match: looks for a header that mentions max + download
 *  + speed, so real Ofcom column names ("Maximum download speed (Mbit/s)")
 *  and our fixture column ("max_download_speed_mbps") both resolve. */
function findMaxSpeedColumn(header: string[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].toLowerCase()
    if (h.includes('max') && h.includes('download') && h.includes('speed')) {
      return i
    }
  }
  return -1
}

function findPostcodeColumn(header: string[]): number {
  // Prefer an exact "postcode" header, fall back to substring match for
  // Ofcom-style "pcd_no_space" or "Postcode (no space)".
  const exact = header.findIndex((h) => h.toLowerCase().trim() === 'postcode')
  if (exact >= 0) return exact
  return header.findIndex((h) => h.toLowerCase().includes('postcode') || h.toLowerCase().includes('pcd'))
}

function parseOfcom(csv: string): OfcomRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const header = splitCsvLine(lines[0]).map((h) => h.trim())
  const pcIdx = findPostcodeColumn(header)
  const speedIdx = findMaxSpeedColumn(header)
  if (pcIdx < 0 || speedIdx < 0) {
    throw new Error(
      `Ofcom CSV missing required columns. Got: ${header.join(', ')}`,
    )
  }
  const out: OfcomRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const postcode = normalisePostcode(cols[pcIdx] ?? '')
    const maxMbps = Number(cols[speedIdx])
    if (!postcode) continue
    if (!Number.isFinite(maxMbps) || maxMbps < 0) continue
    out.push({ postcode, maxMbps })
  }
  return out
}

export async function ingest(opts: IngestOptions): Promise<IngestResult> {
  const realPath = process.env.OFCOM_BROADBAND_CSV_PATH
  const usingReal = !opts.useFixtures && realPath && existsSync(realPath)
  const path = usingReal ? (realPath as string) : FIXTURE_PATH
  if (!existsSync(path)) {
    throw new Error(
      `broadband_speed ingestor: no Ofcom CSV at ${path}. ` +
        `Set OFCOM_BROADBAND_CSV_PATH or place a fixture at ${FIXTURE_PATH}.`,
    )
  }
  const csv = readFileSync(path, 'utf8')
  const rows = parseOfcom(csv)

  const postcodes = loadPostcodeIndex({ useFixtures: opts.useFixtures })

  const allowed = new Set(opts.h3Cells)
  const points: PointValue[] = []
  for (const row of rows) {
    const pc = postcodes.get(row.postcode)
    if (!pc) continue
    points.push({ lat: pc.lat, lng: pc.lng, value: row.maxMbps })
  }

  const grouped = groupPointsByH3(points, opts.h3Resolution, allowed)

  const values: RawByCell = {}
  for (const [cell, speeds] of grouped.entries()) {
    if (speeds.length === 0) continue
    const m = max(speeds)
    values[cell] = Math.min(SPEED_CLAMP_MAX, Math.max(SPEED_CLAMP_MIN, m))
  }

  mkdirSync(opts.outDir, { recursive: true })
  const outPath = resolve(opts.outDir, `${CRITERION_ID}.json`)
  const payload = {
    criterionId: CRITERION_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    version: usingReal
      ? 'Ofcom Connected Nations (live download)'
      : 'Ofcom Connected Nations (bundled fixture)',
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
  if (!regionId) throw new Error('Usage: broadband-speed --region=<id> [--fixtures]')
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

const invokedDirectly = process.argv[1]?.endsWith('broadband-speed.ts')
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
