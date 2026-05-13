/**
 * ONS Postcode Directory loader.
 *
 * The real ONSPD is a ~600 MB CSV (`ONSPD_*.csv`) published quarterly by the
 * ONS Geography portal. For Phase 1 we only need the postcode → lat/lng
 * mapping, and we support two modes:
 *
 *   1. Real CSV: set `ONSPD_CSV_PATH` env var to the local path of an
 *      uncompressed ONSPD file. The loader streams it row-by-row.
 *   2. Bundled fixture: under `scripts/ingest/fixtures/onspd-sample.csv`
 *      — a tiny ~50-row sample covering known cells in Greater London +
 *      West Midlands, used in tests and `useFixtures: true` ingest runs.
 *
 * Either way we expose the same `loadPostcodeIndex()` API.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { repoRoot } from './region'

export interface PostcodeRecord {
  postcode: string // normalised: uppercase, no internal spaces
  lat: number
  lng: number
}

const FIXTURE_PATH = resolve(
  repoRoot(),
  'scripts',
  'ingest',
  'fixtures',
  'onspd-sample.csv',
)

/** Normalise a postcode for joins: uppercase, strip whitespace. */
export function normalisePostcode(pc: string): string {
  return pc.replace(/\s+/g, '').toUpperCase()
}

/**
 * Parse an ONSPD-shaped CSV. We only require `pcds` (postcode), `lat`, `long`
 * columns — these are stable across ONSPD releases. Unknown columns are
 * ignored.
 */
function parseOnspdCsv(csv: string): PostcodeRecord[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const pcdsIdx = header.indexOf('pcds')
  const latIdx = header.indexOf('lat')
  const lngIdx = header.indexOf('long')
  if (pcdsIdx < 0 || latIdx < 0 || lngIdx < 0) {
    throw new Error(
      `ONSPD CSV missing required columns. Got: ${header.join(', ')}`,
    )
  }
  const out: PostcodeRecord[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const lat = Number(cols[latIdx])
    const lng = Number(cols[lngIdx])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    out.push({
      postcode: normalisePostcode(cols[pcdsIdx]),
      lat,
      lng,
    })
  }
  return out
}

/**
 * Load postcode → lat/lng map. Prefers `ONSPD_CSV_PATH` (real data) and
 * falls back to the bundled fixture.
 */
export function loadPostcodeIndex(opts: { useFixtures?: boolean } = {}): Map<
  string,
  PostcodeRecord
> {
  const realPath = process.env.ONSPD_CSV_PATH
  const path =
    !opts.useFixtures && realPath && existsSync(realPath) ? realPath : FIXTURE_PATH
  const csv = readFileSync(path, 'utf8')
  const records = parseOnspdCsv(csv)
  const index = new Map<string, PostcodeRecord>()
  for (const r of records) index.set(r.postcode, r)
  return index
}
