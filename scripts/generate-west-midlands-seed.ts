/**
 * Generate the West Midlands Phase-1 seed dataset.
 *
 * Coverage: Birmingham, Wolverhampton, Walsall, Dudley, Sandwell, Solihull,
 * Coventry — the West Midlands conurbation plus a buffer.
 *
 * Spatial signal we bake in (so the demo map *reads* as the West Midlands):
 *   - Major rivers (Tame, Cole, Stour, Severn-fringe in the west) drive
 *     EA flood bands.
 *   - Central Birmingham + parts of inner Wolverhampton / Coventry have
 *     higher crime density; affluent corridors (Sutton Coldfield,
 *     Harborne, Solihull) lower.
 *   - Schools bias upward in S Birmingham (Edgbaston, Harborne, Moseley),
 *     Solihull, Sutton; lower in inner wards.
 *   - Prices: central Birmingham + Solihull + Sutton bias upward, other
 *     suburbs and Wolverhampton lower.
 *   - Commute time radial decay from Birmingham New Street.
 *   - M6 / M5 / M42 corridors drive noise + air-quality peaks.
 *   - Median salary peaks in Solihull, Edgbaston, Sutton; lower in inner
 *     Birmingham wards and parts of Sandwell.
 *
 * Run: npm run seed:cells:wm
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { polygonToCells, cellToLatLng } from 'h3-js'
import { CRITERIA } from '../src/lib/catalog'
import { standardize } from '../src/lib/standardize'
import type { CellScores, SeedFile } from '../src/lib/types'

const SEED_VERSION = 2

const WM_BBOX = {
  west: -2.30,
  south: 52.28,
  east: -1.30,
  north: 52.72,
}

const BIRMINGHAM = { name: 'Birmingham New Street', lat: 52.4778, lng: -1.8998 }
const SOLIHULL = { lat: 52.4128, lng: -1.7787 }
const SUTTON_COLDFIELD = { lat: 52.5708, lng: -1.8226 }
const WOLVERHAMPTON = { lat: 52.587, lng: -2.128 }
const COVENTRY = { lat: 52.4068, lng: -1.5197 }
const BIRMINGHAM_AIRPORT = { lat: 52.4539, lng: -1.7480 }

/**
 * Substantial nature features near the West Midlands. Drive-time to the
 * nearest drives the `nature_access` criterion (distinct from local
 * `green_space` which is walk-time to nearest park ≥ 2 ha).
 */
const NATURE_FEATURES: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Sutton Park (NNR)',          lat: 52.5660, lng: -1.8472 },
  { name: 'Lickey Hills Country Park',  lat: 52.3722, lng: -2.0093 },
  { name: 'Clent Hills (AONB-adj)',     lat: 52.4222, lng: -2.1057 },
  { name: 'Cannock Chase (AONB)',       lat: 52.7544, lng: -2.0078 },
  { name: 'Wyre Forest (NNR)',          lat: 52.3940, lng: -2.3540 },
  { name: 'Kingsbury Water Park',       lat: 52.5715, lng: -1.6839 },
  { name: 'Sandwell Valley Country Park', lat: 52.5253, lng: -1.9694 },
  { name: 'Kinver Edge',                lat: 52.4475, lng: -2.2483 },
  { name: 'Forest of Mercia (frag.)',   lat: 52.6920, lng: -1.9000 },
  { name: 'Burton Dassett Hills',       lat: 52.1697, lng: -1.4444 },
  { name: 'Cotswolds AONB (north)',     lat: 52.0500, lng: -1.7500 },
  { name: 'Peak District NP (south)',   lat: 52.9700, lng: -1.7800 },
]

// Approximate River Tame + River Cole flow line (E of Birmingham).
const RIVERS: Array<Array<[number, number]>> = [
  // River Tame: Tamworth -> Aston -> Hams Hall area
  [
    [-1.69, 52.63],
    [-1.74, 52.59],
    [-1.78, 52.53],
    [-1.85, 52.50],
    [-1.91, 52.49],
  ],
  // River Cole through east Birmingham
  [
    [-1.83, 52.51],
    [-1.82, 52.48],
    [-1.78, 52.45],
    [-1.78, 52.42],
  ],
  // River Stour (Black Country, Dudley/Stourbridge)
  [
    [-2.15, 52.46],
    [-2.13, 52.45],
    [-2.10, 52.45],
    [-2.04, 52.46],
  ],
  // River Sowe / Sherbourne (Coventry)
  [
    [-1.55, 52.43],
    [-1.52, 52.41],
    [-1.50, 52.39],
  ],
]

// Synthetic A&E hospital points.
const AE_HOSPITALS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Queen Elizabeth (Edgbaston)', lat: 52.4528, lng: -1.9419 },
  { name: 'Heartlands (Bordesley Green)', lat: 52.4831, lng: -1.8253 },
  { name: 'Good Hope (Sutton)', lat: 52.5677, lng: -1.8217 },
  { name: 'Sandwell General (West Bromwich)', lat: 52.5210, lng: -1.9810 },
  { name: 'New Cross (Wolverhampton)', lat: 52.6028, lng: -2.0975 },
  { name: 'Walsall Manor', lat: 52.5870, lng: -1.9870 },
  { name: 'Russells Hall (Dudley)', lat: 52.5042, lng: -2.1097 },
  { name: 'University Hospital Coventry', lat: 52.4202, lng: -1.4391 },
  { name: 'George Eliot (Nuneaton fringe)', lat: 52.5113, lng: -1.4774 },
  { name: 'Birmingham Childrens (city)', lat: 52.4815, lng: -1.9020 },
]

// Major motorway/A-road polylines for noise + NO2 corridors.
const ARTERIALS: Array<Array<[number, number]>> = [
  // M6 north–south through the conurbation
  [
    [-2.10, 52.71], [-2.04, 52.66], [-1.96, 52.61], [-1.92, 52.57],
    [-1.88, 52.52], [-1.83, 52.49], [-1.78, 52.46], [-1.72, 52.43],
    [-1.65, 52.41], [-1.58, 52.39],
  ],
  // M5 west of Birmingham
  [
    [-2.13, 52.60], [-2.09, 52.55], [-2.07, 52.51], [-2.05, 52.48],
    [-2.05, 52.44], [-2.04, 52.40], [-2.02, 52.36],
  ],
  // M42 south of conurbation
  [
    [-1.96, 52.36], [-1.86, 52.36], [-1.78, 52.39], [-1.72, 52.42],
    [-1.66, 52.43], [-1.60, 52.44], [-1.55, 52.46],
  ],
  // A38 / Aston Expressway through central Birmingham
  [
    [-1.96, 52.55], [-1.93, 52.52], [-1.90, 52.49], [-1.88, 52.47],
    [-1.87, 52.45], [-1.86, 52.42],
  ],
  // A45 Coventry corridor east of Birmingham
  [
    [-1.85, 52.45], [-1.78, 52.44], [-1.70, 52.43], [-1.60, 52.42],
    [-1.52, 52.41],
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
const rand = mulberry32(SEED_VERSION * 8101 + 23)

// ─── geo helpers ─────────────────────────────────────────────────────────
function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const x = (((bLng - aLng) * Math.PI) / 180) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180))
  const y = ((bLat - aLat) * Math.PI) / 180
  return Math.sqrt(x * x + y * y) * R
}

function distToPolyline(lat: number, lng: number, line: Array<[number, number]>): number {
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

function minDistToAnyLine(
  lat: number,
  lng: number,
  lines: Array<Array<[number, number]>>,
): number {
  let best = Infinity
  for (const l of lines) {
    const d = distToPolyline(lat, lng, l)
    if (d < best) best = d
  }
  return best
}

function smoothField(lat: number, lng: number, phase: number): number {
  const a = Math.cos((lng + 1.9) * 11 + phase)
  const b = Math.cos((lat - 52.48) * 15 + phase * 1.3)
  const c = Math.cos((lng + lat * 0.3) * 8 + phase * 0.7)
  const raw = (a + b + c) / 3
  const normalized = (raw + 1) / 2
  return Math.max(0, Math.min(1, normalized + (rand() - 0.5) * 0.1))
}

// ─── per-cell generators ─────────────────────────────────────────────────

function rawFloodRisk(lat: number, lng: number): string {
  const d = minDistToAnyLine(lat, lng, RIVERS)
  if (d < 0.3) return 'HIGH'
  if (d < 0.7) return 'MEDIUM'
  if (d < 1.2) return 'LOW'
  if (rand() < 0.03) return 'MEDIUM'
  return 'VERY_LOW'
}

function rawCrimeRate(lat: number, lng: number): number {
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const dCov = distKm(lat, lng, COVENTRY.lat, COVENTRY.lng)
  const dWolv = distKm(lat, lng, WOLVERHAMPTON.lat, WOLVERHAMPTON.lng)
  const peak =
    Math.exp(-dBham / 4) * 110 +
    Math.exp(-dCov / 3.5) * 60 +
    Math.exp(-dWolv / 3.5) * 60
  const baseline = 30
  const field = smoothField(lat, lng, 1.7) * 22
  return Math.max(8, baseline + peak + field - 30)
}

function rawAEDriveTime(lat: number, lng: number): number {
  let nearest = Infinity
  for (const h of AE_HOSPITALS) {
    const d = distKm(lat, lng, h.lat, h.lng)
    if (d < nearest) nearest = d
  }
  const minPerKm = 1.3 + smoothField(lat, lng, 0.4) * 0.5
  return 3 + nearest * minPerKm
}

function rawFireResponse(lat: number, lng: number): number {
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const base = 5 + dBham * 0.3
  const field = smoothField(lat, lng, 2.4) * 3
  return Math.max(3, base + field)
}

const OFSTED_GRADES = ['OUTSTANDING', 'GOOD', 'REQUIRES_IMPROVEMENT', 'INADEQUATE'] as const

function rawSchoolRating(
  lat: number,
  lng: number,
  phase: number,
): typeof OFSTED_GRADES[number] {
  // Solihull, Sutton Coldfield, S Birmingham bias upward.
  const dSolihull = distKm(lat, lng, SOLIHULL.lat, SOLIHULL.lng)
  const dSutton = distKm(lat, lng, SUTTON_COLDFIELD.lat, SUTTON_COLDFIELD.lng)
  const solBoost = Math.exp(-dSolihull / 5) * 0.6
  const suttonBoost = Math.exp(-dSutton / 6) * 0.55
  const southBhamBoost = lat > 52.43 && lat < 52.48 && lng > -1.95 && lng < -1.88 ? 0.4 : 0
  const score = smoothField(lat, lng, phase) + solBoost + suttonBoost + southBhamBoost
  if (score > 1.10) return 'OUTSTANDING'
  if (score > 0.55) return 'GOOD'
  if (score > 0.28) return 'REQUIRES_IMPROVEMENT'
  return 'INADEQUATE'
}

function rawGPWalkTime(lat: number, lng: number): number {
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const field = smoothField(lat, lng, 0.6)
  return 3 + field * 10 + Math.max(0, dBham - 6) * 0.6
}

function rawGreenSpace(lat: number, lng: number): number {
  const field = smoothField(lat, lng, 3.1)
  // Sutton Park, Cannon Hill, Kingsbury Water — the WM is fairly green, so
  // most cells fall within a 10-min walk.
  return 2 + field * 11
}

function rawMedianPrice(lat: number, lng: number): number {
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const dSolihull = distKm(lat, lng, SOLIHULL.lat, SOLIHULL.lng)
  const dSutton = distKm(lat, lng, SUTTON_COLDFIELD.lat, SUTTON_COLDFIELD.lng)
  // WM is markedly cheaper than London. Median c.£230-260k, prime areas higher.
  const centralBoost = Math.exp(-dBham / 5) * 220_000
  const solBoost = Math.exp(-dSolihull / 4) * 240_000
  const suttonBoost = Math.exp(-dSutton / 4) * 180_000
  const field = smoothField(lat, lng, 4.5) * 120_000
  const base = 175_000
  return Math.max(140_000, base + centralBoost * 0.6 + solBoost * 0.6 + suttonBoost * 0.55 + field)
}

function rawCommuteTime(lat: number, lng: number): number {
  const d = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const minPerKm = 1.4 + smoothField(lat, lng, 2.0) * 0.5
  return Math.max(5, 6 + d * minPerKm)
}

const TAX_BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const
function rawCouncilTax(lat: number, lng: number): typeof TAX_BANDS[number] {
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const dSolihull = distKm(lat, lng, SOLIHULL.lat, SOLIHULL.lng)
  const dSutton = distKm(lat, lng, SUTTON_COLDFIELD.lat, SUTTON_COLDFIELD.lng)
  const central = Math.exp(-dBham / 7) * 2
  const aff =
    Math.exp(-dSolihull / 5) * 3 + Math.exp(-dSutton / 5) * 2.5
  const field = smoothField(lat, lng, 5.7) * 2.5
  const idx = Math.round(central + aff + field - 1)
  return TAX_BANDS[Math.max(0, Math.min(7, idx))]
}

function rawAirQualityNO2(lat: number, lng: number): number {
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const innerPeak = Math.exp(-dBham / 4.5) * 18
  const dAirport = distKm(lat, lng, BIRMINGHAM_AIRPORT.lat, BIRMINGHAM_AIRPORT.lng)
  const airportPeak = Math.exp(-dAirport / 3.5) * 6
  const dArt = minDistToAnyLine(lat, lng, ARTERIALS)
  const motorway = Math.exp(-dArt / 0.45) * 13
  const field = smoothField(lat, lng, 6.6) * 5
  return Math.max(5, 8 + innerPeak + airportPeak + motorway + field)
}

function rawRoadNoise(lat: number, lng: number): number {
  const dArt = minDistToAnyLine(lat, lng, ARTERIALS)
  const peak = Math.exp(-dArt / 0.25) * 28
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const inner = Math.exp(-dBham / 4) * 5
  const field = smoothField(lat, lng, 7.3) * 4
  return Math.max(38, 42 + peak + inner + field)
}

function rawBroadbandSpeed(lat: number, lng: number): number {
  // WM has decent FTTP rollout in Coventry/Bham; outer Black Country a bit
  // patchier.
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const field = smoothField(lat, lng, 8.0)
  const base = 500 - Math.max(0, dBham - 8) * 14
  const jitter = field * 400 - 100
  return Math.max(40, Math.min(1000, base + jitter))
}

function rawPTAL(lat: number, lng: number): number {
  // WM doesn't have a TfL-style PTAL grid. Use a proxy: distance to a
  // major rail station + bus density proxy via central decay.
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const dCov = distKm(lat, lng, COVENTRY.lat, COVENTRY.lng)
  const dWolv = distKm(lat, lng, WOLVERHAMPTON.lat, WOLVERHAMPTON.lng)
  const decay = Math.max(
    Math.exp(-dBham / 5) * 7,
    Math.exp(-dCov / 4) * 6,
    Math.exp(-dWolv / 4) * 5.5,
  )
  const field = smoothField(lat, lng, 9.1) * 1.2
  return Math.max(0.3, Math.min(8, decay + field - 0.4))
}

function rawMedianSalary(lat: number, lng: number): number {
  // West Midlands median full-time annual gross was ~£35k in 2023.
  // Higher in Solihull / Sutton Coldfield, lower in inner Brum / Black Country.
  const dSolihull = distKm(lat, lng, SOLIHULL.lat, SOLIHULL.lng)
  const dSutton = distKm(lat, lng, SUTTON_COLDFIELD.lat, SUTTON_COLDFIELD.lng)
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const aff =
    Math.exp(-dSolihull / 4) * 16_000 + Math.exp(-dSutton / 5) * 12_000
  const inner = Math.exp(-dBham / 4) * -4_000 // inner-city dip
  const field = smoothField(lat, lng, 10.4) * 8_000
  return Math.max(22_000, 30_000 + aff + inner + field)
}

function rawNatureAccess(lat: number, lng: number): number {
  // Drive time at average WM speeds (mix of urban 35 km/h + arterial
  // 55 km/h). Picks up that even cells well inside the conurbation are
  // usually within 30 min of Cannock Chase, Sutton Park, or the Lickey
  // Hills.
  let nearestKm = Infinity
  for (const f of NATURE_FEATURES) {
    const d = distKm(lat, lng, f.lat, f.lng)
    if (d < nearestKm) nearestKm = d
  }
  const minPerKm = 1.3 + smoothField(lat, lng, 13.7) * 0.5
  return 3 + nearestKm * minPerKm
}

function rawGymAccess(lat: number, lng: number): number {
  // Walking minutes to nearest gym/leisure centre. Bigger market towns are
  // well-served; rural fringes a bit further.
  const dBham = distKm(lat, lng, BIRMINGHAM.lat, BIRMINGHAM.lng)
  const dCov = distKm(lat, lng, COVENTRY.lat, COVENTRY.lng)
  const dWolv = distKm(lat, lng, WOLVERHAMPTON.lat, WOLVERHAMPTON.lng)
  const dSolihull = distKm(lat, lng, SOLIHULL.lat, SOLIHULL.lng)
  const minD = Math.min(dBham, dCov, dWolv, dSolihull)
  const field = smoothField(lat, lng, 11.2)
  return 4 + field * 8 + Math.max(0, minD - 4) * 1.1
}

// ─── main ────────────────────────────────────────────────────────────────

function main() {
  const bbox = WM_BBOX
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
      nature_access: rawNatureAccess(lat, lng),
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
    region: 'west-midlands',
    regionDisplayName: 'West Midlands',
    country: 'United Kingdom',
    h3Resolution: H3_RES,
    bbox,
    anchor: BIRMINGHAM,
    cellCount: cells.length,
    cells,
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const outPath = resolve(
    __dirname,
    '../public/data/regions/west-midlands.cells.json',
  )
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(out))
  console.log(
    `Wrote ${outPath} (${cells.length} cells, version ${SEED_VERSION}).`,
  )
}

main()
