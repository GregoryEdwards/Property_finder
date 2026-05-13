/**
 * Generate the Greater London Phase-1 seed dataset.
 *
 * Produces src/data/london-seed.json — every H3 cell at resolution 8 inside
 * the Greater London bbox (~M25), with synthetic-but-plausible raw values
 * and standardised 0..100 scores for each of the 15 Phase-1 criteria.
 *
 * Spatial signal we bake in (so the demo map *looks* like London):
 *   - Thames corridor + tidal floodplain drive flood-risk bands.
 *   - Central + East London have higher crime density; outer suburbs lower.
 *   - West / North-west London bias upward on schools; SE / E parts of inner
 *     ring bias downward (historic Ofsted patterns).
 *   - Prices decay radially from Zone 1, with prime-area bumps (Notting Hill,
 *     Chelsea, Hampstead, Richmond, Wimbledon).
 *   - Commute time: radial decay from Charing Cross (the conventional centre).
 *   - PTAL: 6b in Zone 1, falling to 1 in outer suburbs.
 *   - Air quality: worst near Heathrow approach + inner ring road corridors.
 *   - Council tax: lower bands cluster in outer / east; higher bands in W / SW.
 *   - Noise: peaks along M25, A406, A40, A2, near Heathrow.
 *
 * Determinism: seeded PRNG so regeneration is byte-stable.
 *
 * Run: npm run seed
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { polygonToCells, cellToLatLng } from 'h3-js'
import { CRITERIA } from '../src/lib/catalog'
import { standardize } from '../src/lib/standardize'
import type { CellScores, SeedFile } from '../src/lib/types'

const SEED_VERSION = 3

// Greater London bbox — slightly larger than the M25 for context.
const LONDON_BBOX = {
  west: -0.55,
  south: 51.28,
  east: 0.33,
  north: 51.71,
}

const CHARING_CROSS = { name: 'Charing Cross', lat: 51.5074, lng: -0.1278 }
const HEATHROW = { lat: 51.47, lng: -0.4543 }

// Approximate Thames polyline through London (E to W).
const THAMES: Array<[number, number]> = [
  [-0.55, 51.43],
  [-0.41, 51.46],
  [-0.31, 51.47],
  [-0.23, 51.485],
  [-0.16, 51.495],
  [-0.11, 51.508],
  [-0.075, 51.508],
  [-0.024, 51.51],
  [0.03, 51.5],
  [0.10, 51.50],
  [0.20, 51.485],
  [0.33, 51.48],
]

// Synthetic NHS A&E hospital points spread across London (Royal London,
// St Thomas', Royal Free, King's, St Mary's, Chelsea & Westminster, etc.).
const AE_HOSPITALS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'St Thomas', lat: 51.4980, lng: -0.1187 },
  { name: 'Royal London', lat: 51.5174, lng: -0.0593 },
  { name: 'Royal Free', lat: 51.5530, lng: -0.1660 },
  { name: "King's", lat: 51.4685, lng: -0.0935 },
  { name: "St Mary's", lat: 51.5170, lng: -0.1735 },
  { name: 'Chelsea & W', lat: 51.4847, lng: -0.1820 },
  { name: 'Whittington', lat: 51.5663, lng: -0.1383 },
  { name: 'Lewisham', lat: 51.4571, lng: -0.0186 },
  { name: 'Kingston', lat: 51.4106, lng: -0.2867 },
  { name: 'Northwick Park', lat: 51.5790, lng: -0.3196 },
  { name: 'Croydon U', lat: 51.3855, lng: -0.1010 },
  { name: 'Newham', lat: 51.5235, lng: 0.0413 },
]

// Major arterial road polylines — drive the noise field and (loosely) the
// road-traffic NO2 corridors.
const ARTERIALS: Array<Array<[number, number]>> = [
  // M25 ring approximated as a circle of 8 vertices.
  (() => {
    const cx = -0.0
    const cy = 51.50
    const r = 0.28
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * Math.PI * 2
      pts.push([cx + Math.cos(t) * r * 1.05, cy + Math.sin(t) * r * 0.78])
    }
    return pts
  })(),
  // A406 North Circular (rough)
  [
    [-0.36, 51.557], [-0.30, 51.583], [-0.21, 51.598], [-0.13, 51.603],
    [-0.06, 51.602], [0.02, 51.59], [0.08, 51.575], [0.10, 51.55],
  ],
  // A205 South Circular (rough)
  [
    [-0.30, 51.460], [-0.21, 51.450], [-0.15, 51.445], [-0.08, 51.450],
    [0.00, 51.460], [0.06, 51.465], [0.12, 51.470],
  ],
  // A40 corridor
  [
    [-0.46, 51.530], [-0.36, 51.530], [-0.24, 51.523], [-0.18, 51.517],
    [-0.11, 51.516],
  ],
]

const H3_RES = 8

// ─── deterministic PRNG ──────────────────────────────────────────────────
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
const rand = mulberry32(SEED_VERSION * 7919 + 17)

// ─── geo helpers ─────────────────────────────────────────────────────────

function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const x = (((bLng - aLng) * Math.PI) / 180) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180))
  const y = ((bLat - aLat) * Math.PI) / 180
  return Math.sqrt(x * x + y * y) * R
}

function distToPolyline(
  lat: number,
  lng: number,
  line: Array<[number, number]>,
): number {
  let best = Infinity
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i]
    const [bx, by] = line[i + 1]
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

function minDistToAnyArterial(lat: number, lng: number): number {
  let best = Infinity
  for (const a of ARTERIALS) {
    const d = distToPolyline(lat, lng, a)
    if (d < best) best = d
  }
  return best
}

/** Smooth value field: low-frequency cosines + noise, in [0, 1]. */
function smoothField(lat: number, lng: number, phase: number): number {
  const a = Math.cos((lng + 0.1) * 14 + phase)
  const b = Math.cos((lat - 51.5) * 18 + phase * 1.3)
  const c = Math.cos((lng + lat * 0.3) * 9 + phase * 0.7)
  const raw = (a + b + c) / 3
  const normalized = (raw + 1) / 2
  return Math.max(0, Math.min(1, normalized + (rand() - 0.5) * 0.1))
}

// ─── per-cell raw value generators ───────────────────────────────────────

function rawFloodRisk(lat: number, lng: number): string {
  const dRiver = distToPolyline(lat, lng, THAMES)
  // Tidal flood plain extends roughly 1.5km from the Thames in E London.
  if (dRiver < 0.4) return 'HIGH'
  if (dRiver < 0.9) return 'MEDIUM'
  if (dRiver < 1.6 && lng > -0.15) return 'MEDIUM' // E-side flood plain widening
  if (dRiver < 2.0) return 'LOW'
  // Surface-water pockets scattered randomly.
  if (rand() < 0.04) return 'MEDIUM'
  return 'VERY_LOW'
}

function rawCrimeRate(lat: number, lng: number): number {
  // Inner east + central peaks. Crimes per 1k residents / yr.
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const eastBias = Math.max(0, (lng + 0.1) * 60) // east of -0.1 → up
  const baseline = 35 + eastBias
  const innerPeak = Math.exp(-dCentre / 5) * 80
  const field = smoothField(lat, lng, 1.7) * 25
  return Math.max(8, baseline + innerPeak + field - 25)
}

function rawAEDriveTime(lat: number, lng: number): number {
  let nearestKm = Infinity
  for (const h of AE_HOSPITALS) {
    const d = distKm(lat, lng, h.lat, h.lng)
    if (d < nearestKm) nearestKm = d
  }
  const minPerKm = 1.4 + smoothField(lat, lng, 0.4) * 0.5
  return 3 + nearestKm * minPerKm
}

function rawFireResponse(lat: number, lng: number): number {
  // Roughly correlated with PTAL/density — denser areas closer to fire stations.
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const base = 4 + dCentre * 0.35
  const field = smoothField(lat, lng, 2.4) * 3
  return Math.max(3, base + field)
}

const OFSTED_GRADES = ['OUTSTANDING', 'GOOD', 'REQUIRES_IMPROVEMENT', 'INADEQUATE'] as const

function rawSchoolRating(
  lat: number,
  lng: number,
  phase: number,
): typeof OFSTED_GRADES[number] {
  // West / NW Bias on positive outcomes, with overall ~60% Good, 15% Outstanding,
  // 20% Requires Improvement, 5% Inadequate -- shifted by geography.
  const westBoost = Math.max(0, (-0.1 - lng) * 0.4) // 0..~0.18
  const northBoost = Math.max(0, (lat - 51.45) * 0.2)
  const score = smoothField(lat, lng, phase) + westBoost + northBoost
  // Higher score → better grade
  if (score > 1.05) return 'OUTSTANDING'
  if (score > 0.55) return 'GOOD'
  if (score > 0.28) return 'REQUIRES_IMPROVEMENT'
  return 'INADEQUATE'
}

function rawGPWalkTime(lat: number, lng: number): number {
  // GPs are dense in London. Walk time field 2..18 min.
  const field = smoothField(lat, lng, 0.6)
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  return 2 + field * 8 + Math.max(0, dCentre - 8) * 0.4
}

function rawGreenSpace(lat: number, lng: number): number {
  // Walking minutes to nearest park >= 2 ha.
  // Most of London has a park within 10 min; outer suburbs slightly further.
  const field = smoothField(lat, lng, 3.1)
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  return 2 + field * 12 + Math.max(0, dCentre - 12) * 0.5
}

function rawMedianPrice(lat: number, lng: number): number {
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  // Strong radial decay from Zone 1; W and N bias upward.
  const westBoost = Math.max(0, (-0.1 - lng) * 380_000) // up to ~+170k near Acton
  const northBoost = Math.max(0, (lat - 51.45) * 280_000)
  const centralBoost = Math.exp(-dCentre / 6) * 1_400_000
  const field = smoothField(lat, lng, 4.5) * 400_000
  const base = 280_000
  return Math.max(220_000, base + centralBoost + westBoost + northBoost * 0.6 + field)
}

function rawCommuteTime(lat: number, lng: number): number {
  // Tube/rail commute to Charing Cross. Radial-ish but with a slight bias
  // for the western corridors (Met/H&C/Piccadilly lines).
  const d = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const westBias = lng < -0.2 ? -1.5 : 0
  const minPerKm = 1.6 + smoothField(lat, lng, 2.0) * 0.6
  return Math.max(5, 6 + d * minPerKm + westBias)
}

const TAX_BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const
function rawCouncilTax(
  lat: number,
  lng: number,
): typeof TAX_BANDS[number] {
  // Higher bands cluster with higher prices, but with some randomness so it
  // isn't redundant with median_price.
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const westBoost = Math.max(0, (-0.1 - lng) * 4)
  const centralBoost = Math.exp(-dCentre / 7) * 4
  const field = smoothField(lat, lng, 5.7) * 3
  const idx = Math.round(westBoost + centralBoost + field - 2)
  return TAX_BANDS[Math.max(0, Math.min(7, idx))]
}

function rawAirQualityNO2(lat: number, lng: number): number {
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const innerPeak = Math.exp(-dCentre / 5) * 22
  const dHeathrow = distKm(lat, lng, HEATHROW.lat, HEATHROW.lng)
  const heathrowPeak = Math.exp(-dHeathrow / 4) * 8
  const dArterial = minDistToAnyArterial(lat, lng)
  const roadCorridor = Math.exp(-dArterial / 0.4) * 12
  const field = smoothField(lat, lng, 6.6) * 6
  const base = 10
  return Math.max(6, base + innerPeak + heathrowPeak + roadCorridor + field)
}

function rawRoadNoise(lat: number, lng: number): number {
  const dArterial = minDistToAnyArterial(lat, lng)
  const peak = Math.exp(-dArterial / 0.25) * 28
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const innerBoost = Math.exp(-dCentre / 4) * 6
  const dHeathrow = distKm(lat, lng, HEATHROW.lat, HEATHROW.lng)
  const heathrowBoost = Math.exp(-dHeathrow / 5) * 5
  const field = smoothField(lat, lng, 7.3) * 4
  return Math.max(38, 42 + peak + innerBoost + heathrowBoost + field)
}

function rawBroadbandSpeed(lat: number, lng: number): number {
  // London is mostly well-connected. 100..1000 Mbps with some patchier pockets.
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const field = smoothField(lat, lng, 8.0)
  const base = 600 - Math.max(0, dCentre - 8) * 18
  const jitter = field * 350 - 100
  return Math.max(40, Math.min(1000, base + jitter))
}

function rawMedianSalary(lat: number, lng: number): number {
  // ONS ASHE median full-time annual gross. London median was ~£44k (2023).
  // Higher in central/west/SW; lower toward east/outer-east.
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const westBoost = Math.max(0, (-0.1 - lng) * 60_000)
  const centralBoost = Math.exp(-dCentre / 7) * 28_000
  const field = smoothField(lat, lng, 10.4) * 14_000
  return Math.max(23_000, 32_000 + centralBoost + westBoost * 0.5 + field)
}

function rawGymAccess(lat: number, lng: number): number {
  // Walking minutes to nearest gym/leisure centre. Dense in inner London
  // (PureGym, Virgin Active, council leisure centres), thinner outer ring.
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const field = smoothField(lat, lng, 11.2)
  return 3 + field * 9 + Math.max(0, dCentre - 6) * 0.7
}

function rawPTAL(lat: number, lng: number): number {
  // 0..8 (TfL uses 0..6b; we map 6b → ~8).
  const dCentre = distKm(lat, lng, CHARING_CROSS.lat, CHARING_CROSS.lng)
  const decay = Math.exp(-dCentre / 5.5) * 8
  const field = smoothField(lat, lng, 9.1) * 1.4
  return Math.max(0.3, Math.min(8, decay + field - 0.4))
}

// ─── main ────────────────────────────────────────────────────────────────

function main() {
  const bbox = LONDON_BBOX
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
      flood_risk: rawFloodRisk(lat, lng),
      crime_rate: rawCrimeRate(lat, lng),
      ae_drive_time: rawAEDriveTime(lat, lng),
      fire_response: rawFireResponse(lat, lng),
      primary_school: rawSchoolRating(lat, lng, 0.4),
      secondary_school: rawSchoolRating(lat, lng, 1.2),
      gp_walk_time: rawGPWalkTime(lat, lng),
      green_space: rawGreenSpace(lat, lng),
      median_price: rawMedianPrice(lat, lng),
      commute_time: rawCommuteTime(lat, lng),
      council_tax: rawCouncilTax(lat, lng),
      air_quality_no2: rawAirQualityNO2(lat, lng),
      noise_road: rawRoadNoise(lat, lng),
      broadband_speed: rawBroadbandSpeed(lat, lng),
      ptal: rawPTAL(lat, lng),
      median_salary: rawMedianSalary(lat, lng),
      gym_access: rawGymAccess(lat, lng),
    }
    const scores: Record<string, number> = {}
    for (const c of CRITERIA) {
      const r = raw[c.id]
      if (r === undefined) continue
      scores[c.id] = Math.round(standardize(r, c.transform, c.direction))
    }
    cells.push({ h3, scores, raw })
  }

  const out: SeedFile = {
    version: SEED_VERSION,
    generatedAt: new Date().toISOString(),
    region: 'greater-london',
    regionDisplayName: 'Greater London',
    country: 'United Kingdom',
    h3Resolution: H3_RES,
    bbox,
    anchor: CHARING_CROSS,
    cellCount: cells.length,
    cells,
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const outPath = resolve(
    __dirname,
    '../public/data/regions/greater-london.cells.json',
  )
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(out))
  console.log(
    `Wrote ${outPath} (${cells.length} cells, version ${SEED_VERSION}).`,
  )
}

main()
