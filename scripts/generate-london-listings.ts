/**
 * Generate synthetic UK property listings inside Greater London.
 *
 * Phase 1 ships with placeholder listings; Phase 2 replaces these with a
 * real Rightmove / Zoopla / OnTheMarket feed once a licensing path is
 * agreed. Listings inherit their cell's suitability score for the
 * per-property scorecard.
 *
 * Fields mirror Rightmove conventions (square feet, EPC band A-G, tenure,
 * council tax band, days-on-market).
 *
 * Run: npm run seed:listings
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { latLngToCell, cellToLatLng } from 'h3-js'
import type { Listing, SeedFile } from '../src/lib/types'

const SEED_VERSION = 1
const TARGET_LISTING_COUNT = 240

const PROP_TYPES: Listing['propertyType'][] = [
  'flat',
  'flat',
  'flat',
  'terraced',
  'terraced',
  'semi_detached',
  'detached',
  'maisonette',
]

const TENURES: Listing['tenure'][] = [
  'leasehold',
  'leasehold',
  'leasehold',
  'freehold',
  'freehold',
  'share_of_freehold',
]

// Postcode area prefixes by approximate bbox. Used to label listings with a
// plausible postcode prefix rather than a randomly generated one.
const POSTCODE_AREAS: Array<{
  prefix: string
  west: number
  south: number
  east: number
  north: number
}> = [
  { prefix: 'SW',  west: -0.30, south: 51.36, east: -0.10, north: 51.50 },
  { prefix: 'SE',  west: -0.13, south: 51.39, east:  0.10, north: 51.52 },
  { prefix: 'W',   west: -0.40, south: 51.49, east: -0.18, north: 51.55 },
  { prefix: 'NW',  west: -0.40, south: 51.53, east: -0.16, north: 51.65 },
  { prefix: 'N',   west: -0.20, south: 51.55, east: -0.05, north: 51.70 },
  { prefix: 'E',   west: -0.10, south: 51.50, east:  0.20, north: 51.68 },
  { prefix: 'WC',  west: -0.14, south: 51.50, east: -0.10, north: 51.53 },
  { prefix: 'EC',  west: -0.12, south: 51.50, east: -0.07, north: 51.53 },
  { prefix: 'CR',  west: -0.18, south: 51.30, east: -0.05, north: 51.42 },
  { prefix: 'BR',  west:  0.00, south: 51.35, east:  0.20, north: 51.45 },
  { prefix: 'DA',  west:  0.10, south: 51.42, east:  0.30, north: 51.50 },
  { prefix: 'IG',  west:  0.05, south: 51.55, east:  0.20, north: 51.68 },
  { prefix: 'RM',  west:  0.10, south: 51.52, east:  0.32, north: 51.60 },
  { prefix: 'HA',  west: -0.45, south: 51.55, east: -0.32, north: 51.68 },
  { prefix: 'UB',  west: -0.50, south: 51.48, east: -0.35, north: 51.58 },
  { prefix: 'TW',  west: -0.45, south: 51.40, east: -0.28, north: 51.50 },
  { prefix: 'KT',  west: -0.45, south: 51.30, east: -0.20, north: 51.42 },
  { prefix: 'SM',  west: -0.25, south: 51.32, east: -0.12, north: 51.40 },
]

function postcodePrefix(lat: number, lng: number): string {
  for (const a of POSTCODE_AREAS) {
    if (lat >= a.south && lat <= a.north && lng >= a.west && lng <= a.east) {
      return a.prefix
    }
  }
  return 'SE' // fallback for cells outside the listed prefixes
}

// ─── deterministic PRNG ─────────────────────────────────────────────────
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
const rand = mulberry32(SEED_VERSION * 4093 + 31)

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

function jitter(value: number, pct: number): number {
  return value * (1 + (rand() - 0.5) * 2 * pct)
}

function epcFromBuildPeriod(rand01: number): Listing['epc'] {
  // Synthetic distribution: ~5% A, 12% B, 35% C, 30% D, 13% E, 4% F, 1% G.
  if (rand01 < 0.05) return 'A'
  if (rand01 < 0.17) return 'B'
  if (rand01 < 0.52) return 'C'
  if (rand01 < 0.82) return 'D'
  if (rand01 < 0.95) return 'E'
  if (rand01 < 0.99) return 'F'
  return 'G'
}

const STREET_TYPES = ['Road', 'Street', 'Lane', 'Avenue', 'Crescent', 'Mews', 'Gardens', 'Walk', 'Place', 'Hill', 'Park']
const STREET_NAMES = [
  'Acacia', 'Beech', 'Cedar', 'Chestnut', 'Dorset', 'Elm', 'Fairfax',
  'Greenwood', 'Hazel', 'Ivy', 'Juniper', 'Kingsley', 'Linden', 'Maple',
  'Newgate', 'Oakwood', 'Primrose', 'Queens', 'Rowan', 'Sycamore',
  'Trinity', 'Underhill', 'Victoria', 'Willow', 'York',
]

function addressLine(): string {
  const n = 1 + Math.floor(rand() * 240)
  return `${n} ${pick(STREET_NAMES)} ${pick(STREET_TYPES)}`
}

function postcodeFor(lat: number, lng: number): string {
  const area = postcodePrefix(lat, lng)
  const district = 1 + Math.floor(rand() * 28)
  const sector = Math.floor(rand() * 10)
  const unit = String.fromCharCode(65 + Math.floor(rand() * 26)) + String.fromCharCode(65 + Math.floor(rand() * 26))
  return `${area}${district} ${sector}${unit}`
}

// ─── main ───────────────────────────────────────────────────────────────

function main() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const seedPath = resolve(__dirname, '../src/data/london-seed.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf-8')) as SeedFile

  // Build a weighted sampling pool of cells: cells with better composite
  // pricing context (median price within reasonable range) and high PTAL
  // are more likely to have listings. This produces a realistic urban-bias
  // distribution without overfitting to one borough.
  const cellPool: Array<{ h3: string; lat: number; lng: number; weight: number }> = []
  for (const cell of seed.cells) {
    const [lat, lng] = cellToLatLng(cell.h3)
    const priceScore = Number(cell.scores.median_price ?? 50)
    const ptalScore = Number(cell.scores.ptal ?? 50)
    // Active listings concentrate where price is mid-range and PTAL is decent.
    // We *don't* want them only in the cheapest or most expensive cells.
    const midPriceBias = 1 - Math.abs(priceScore - 60) / 60
    const w = Math.max(0.05, midPriceBias * 0.5 + ptalScore / 100)
    cellPool.push({ h3: cell.h3, lat, lng, weight: w })
  }
  const totalW = cellPool.reduce((s, c) => s + c.weight, 0)

  function sampleCell() {
    let r = rand() * totalW
    for (const c of cellPool) {
      r -= c.weight
      if (r <= 0) return c
    }
    return cellPool[cellPool.length - 1]
  }

  const cellByH3 = new Map(seed.cells.map((c) => [c.h3, c]))

  const listings: Listing[] = []
  for (let i = 0; i < TARGET_LISTING_COUNT; i++) {
    const c = sampleCell()
    // Slightly offset the listing from the cell centre.
    const lat = c.lat + (rand() - 0.5) * 0.005
    const lng = c.lng + (rand() - 0.5) * 0.008
    const h3 = latLngToCell(lat, lng, seed.h3Resolution)
    const cell = cellByH3.get(h3) ?? cellByH3.get(c.h3)!
    const medianPrice = Number(cell.raw.median_price) || 600_000

    const propertyType = pick(PROP_TYPES)
    const beds =
      propertyType === 'flat'
        ? pick([1, 1, 2, 2, 2, 3] as const)
        : propertyType === 'maisonette'
          ? pick([1, 2, 2, 3] as const)
          : pick([2, 3, 3, 4, 4, 5] as const)
    const baths = Math.max(1, Math.min(beds, beds - 1 + Math.floor(rand() * 2)))
    const sqft =
      propertyType === 'flat'
        ? 380 + beds * 220 + Math.floor(rand() * 200)
        : propertyType === 'maisonette'
          ? 500 + beds * 250 + Math.floor(rand() * 220)
          : 700 + beds * 280 + Math.floor(rand() * 400)
    // Per-property price = cell-level median ± jitter, scaled by beds and type.
    const typeMul =
      propertyType === 'detached'
        ? 1.45
        : propertyType === 'semi_detached'
          ? 1.18
          : propertyType === 'terraced'
            ? 1.02
            : propertyType === 'maisonette'
              ? 0.95
              : 0.85
    const bedMul = 0.7 + beds * 0.18
    const price = Math.round(jitter(medianPrice * typeMul * bedMul, 0.18) / 1000) * 1000

    const listing: Listing = {
      id: `LST-${(i + 1).toString().padStart(5, '0')}`,
      lng,
      lat,
      h3,
      postcode: postcodeFor(lat, lng),
      addressLine: addressLine(),
      price,
      beds,
      baths,
      sqft,
      propertyType,
      tenure:
        propertyType === 'flat' || propertyType === 'maisonette'
          ? pick(['leasehold', 'leasehold', 'leasehold', 'share_of_freehold'] as const)
          : pick(TENURES),
      epc: epcFromBuildPeriod(rand()),
      councilTaxBand: (cell.raw.council_tax as Listing['councilTaxBand']) ?? 'D',
      daysOnMarket: 1 + Math.floor(rand() * 95),
      photoSeed: 200 + i,
    }
    listings.push(listing)
  }

  const out = {
    version: SEED_VERSION,
    generatedAt: new Date().toISOString(),
    region: 'greater-london',
    count: listings.length,
    listings,
  }

  const outPath = resolve(__dirname, '../src/data/london-listings.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(out))
  console.log(`Wrote ${outPath} (${listings.length} listings).`)
}

main()
