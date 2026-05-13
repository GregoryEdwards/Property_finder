/**
 * Generate the Austin Phase-0 demo seed dataset.
 *
 * Produces src/data/austin-seed.json:
 *   - Every H3 cell at resolution 8 inside the Austin metro bbox.
 *   - Per cell: raw value + standardized 0..100 score for each of the 6
 *     Phase-0 criteria.
 *
 * The dataset is *synthetic but spatially coherent* — we want the demo map to
 * look plausible (downtown is denser/pricier, west hills score higher on
 * schools, the Colorado River corridor shows flood exposure, etc.) without
 * shipping any real licensed data. Phase 1 replaces this with the real
 * pipeline output.
 *
 * Determinism: a seeded PRNG ensures the seed file regenerates byte-identical
 * runs. Bump SEED_VERSION when changing generation logic.
 *
 * Run: npm run seed
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { polygonToCells, cellToLatLng } from 'h3-js'
import { CRITERIA } from '../src/lib/catalog'
import { standardize } from '../src/lib/standardize'
import type { CellScores } from '../src/lib/types'

const SEED_VERSION = 1

// Austin metro bbox: a ~60km × 65km rectangle centered on downtown.
const AUSTIN_BBOX = {
  west: -98.05,
  south: 30.10,
  east: -97.50,
  north: 30.55,
}

const DOWNTOWN_AUSTIN = { lat: 30.2672, lng: -97.7431 }

// Synthetic Level-I/II trauma centers (Brackenridge-ish, St. David's, Dell, etc.)
const HOSPITALS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Downtown', lat: 30.2735, lng: -97.7405 },
  { name: 'North Central', lat: 30.4012, lng: -97.7234 },
  { name: 'South', lat: 30.2245, lng: -97.7689 },
  { name: 'Round Rock', lat: 30.5083, lng: -97.6789 },
  { name: 'West', lat: 30.3010, lng: -97.8312 },
]

// Synthetic floodway corridor: a polyline approximating the Colorado River
// + a tributary creek. Cells within ~0.6 km of this line are floodway/AE.
const FLOOD_LINE: Array<[number, number]> = [
  [-98.0, 30.40],
  [-97.85, 30.36],
  [-97.78, 30.31],
  [-97.74, 30.27],
  [-97.70, 30.25],
  [-97.62, 30.22],
  [-97.55, 30.18],
]

const H3_RES = 8

// ---------- deterministic PRNG ----------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(SEED_VERSION * 1009)

// ---------- geo helpers ------------------------------------------------------

/** Approximate distance in km between two lng/lat points (equirectangular). */
function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const x = (((bLng - aLng) * Math.PI) / 180) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180))
  const y = ((bLat - aLat) * Math.PI) / 180
  return Math.sqrt(x * x + y * y) * R
}

/** Min distance in km from a point to a polyline (great-arc segments). */
function distToPolyline(
  lat: number,
  lng: number,
  line: Array<[number, number]>,
): number {
  let best = Infinity
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i]
    const [bx, by] = line[i + 1]
    // Project point onto segment in lng/lat space (acceptable at city scale).
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    let t = len2 === 0 ? 0 : ((lng - ax) * dx + (lat - ay) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    const px = ax + t * dx
    const py = ay + t * dy
    const d = distKm(lat, lng, py, px)
    if (d < best) best = d
  }
  return best
}

/** Smooth value field: low-frequency cosine bumps + noise, in [0, 1]. */
function smoothField(lat: number, lng: number, phase: number): number {
  const a = Math.cos((lng + 97.75) * 5 + phase)
  const b = Math.cos((lat - 30.30) * 6 + phase * 1.3)
  const c = Math.cos((lng + lat * 0.3 + 67) * 3 + phase * 0.7)
  const raw = (a + b + c) / 3 // ~ [-1, 1]
  const normalized = (raw + 1) / 2
  return Math.max(0, Math.min(1, normalized + (rand() - 0.5) * 0.08))
}

// ---------- per-cell raw value generators -----------------------------------

function rawFloodZone(lat: number, lng: number): string {
  const d = distToPolyline(lat, lng, FLOOD_LINE)
  if (d < 0.25) return 'FLOODWAY'
  if (d < 0.6) return 'AE'
  if (d < 1.1) return rand() < 0.5 ? 'AE' : 'X500'
  if (d < 2.0) return 'X500'
  return 'X'
}

function rawSchoolRating(lat: number, lng: number): number {
  // West/north Austin scores higher; south/east lower. 1..10.
  const westBoost = Math.max(0, (-97.7431 - lng) * 8) // up to ~2.5
  const northBoost = Math.max(0, (lat - 30.20) * 4) // up to ~1.4
  const field = smoothField(lat, lng, 0.5) * 3 // ~0..3 jitter
  const value = 4 + westBoost + northBoost + field
  return Math.max(1, Math.min(10, value))
}

function rawCrimeIndex(lat: number, lng: number): number {
  // Higher near central east; lower in suburbs. Per-1k-resident incidents/yr.
  const dDowntown = distKm(lat, lng, DOWNTOWN_AUSTIN.lat, DOWNTOWN_AUSTIN.lng)
  const eastBias = Math.max(0, (lng + 97.7) * 8) // east of -97.7 → up
  const baseline = 22 + eastBias * 5
  const decay = Math.exp(-dDowntown / 8) * 35 // peak ~35 extra near center
  const field = smoothField(lat, lng, 1.7) * 12
  return Math.max(2, baseline + decay + field - 18)
}

function rawHospitalDriveTime(lat: number, lng: number): number {
  let nearestKm = Infinity
  for (const h of HOSPITALS) {
    const d = distKm(lat, lng, h.lat, h.lng)
    if (d < nearestKm) nearestKm = d
  }
  // Rough drive-time model: 1.2 min/km in dense areas, 1.0 min/km in sprawl,
  // plus a fixed origination time. Slight randomness for "traffic."
  const minPerKm = 1.05 + smoothField(lat, lng, 0.9) * 0.4
  return 2 + nearestKm * minPerKm
}

function rawCommuteTime(lat: number, lng: number): number {
  // Default anchor: downtown Austin.
  const d = distKm(lat, lng, DOWNTOWN_AUSTIN.lat, DOWNTOWN_AUSTIN.lng)
  const minPerKm = 1.1 + smoothField(lat, lng, 2.1) * 0.5
  return 3 + d * minPerKm
}

function rawMedianHomePrice(lat: number, lng: number): number {
  // Higher in west/central, lower in southeast. USD.
  const westBoost = Math.max(0, (-97.7431 - lng) * 280_000) // ~+90k per 0.3 deg
  const centralBoost = Math.exp(
    -distKm(lat, lng, DOWNTOWN_AUSTIN.lat, DOWNTOWN_AUSTIN.lng) / 6,
  ) * 350_000
  const field = smoothField(lat, lng, 3.3) * 250_000
  const price = 320_000 + westBoost + centralBoost + field
  return Math.max(180_000, price)
}

// ---------- main -------------------------------------------------------------

function main() {
  // Build a closed polygon (lat, lng) for h3-js polygonToCells.
  const bbox = AUSTIN_BBOX
  const polygon: Array<[number, number]> = [
    [bbox.south, bbox.west],
    [bbox.south, bbox.east],
    [bbox.north, bbox.east],
    [bbox.north, bbox.west],
    [bbox.south, bbox.west],
  ]
  const indexes = polygonToCells(polygon, H3_RES)
  console.log(`Generated ${indexes.length} H3 cells at resolution ${H3_RES}.`)

  const cells: CellScores[] = []
  for (const h3 of indexes) {
    const [lat, lng] = cellToLatLng(h3)
    const raw: Record<string, number | string> = {
      flood_zone: rawFloodZone(lat, lng),
      school_rating: rawSchoolRating(lat, lng),
      crime_index: rawCrimeIndex(lat, lng),
      hospital_drive_time: rawHospitalDriveTime(lat, lng),
      commute_time: rawCommuteTime(lat, lng),
      median_home_price: rawMedianHomePrice(lat, lng),
    }
    const scores: Record<string, number> = {}
    for (const c of CRITERIA) {
      const r = raw[c.id]
      if (r === undefined) continue
      scores[c.id] = Math.round(standardize(r, c.transform, c.direction))
    }
    cells.push({ h3, scores, raw })
  }

  const out = {
    version: SEED_VERSION,
    generatedAt: new Date().toISOString(),
    metro: 'austin',
    h3Resolution: H3_RES,
    bbox,
    downtownAnchor: DOWNTOWN_AUSTIN,
    cellCount: cells.length,
    cells,
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const outPath = resolve(__dirname, '../src/data/austin-seed.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(out))
  console.log(`Wrote ${outPath} (${cells.length} cells, version ${SEED_VERSION}).`)
}

main()
