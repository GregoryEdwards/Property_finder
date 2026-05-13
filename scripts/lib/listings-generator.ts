/**
 * Reusable synthetic-listing generator. Each region calls this with its own
 * seed file path, postcode area table, and target listing count. The
 * Rightmove-style field set is shared.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { latLngToCell, cellToLatLng } from 'h3-js'
import type { Listing, SeedFile } from '../../src/lib/types'

export interface PostcodeArea {
  prefix: string
  west: number
  south: number
  east: number
  north: number
}

export interface ListingsGenerationOptions {
  /** Filename to read the cells seed from (absolute path). */
  seedPath: string
  /** Filename to write listings to (absolute path). */
  outPath: string
  /** Postcode area lookups for the region. */
  postcodeAreas: PostcodeArea[]
  /** Fallback postcode prefix for points outside any area. */
  fallbackPostcode: string
  /** How many listings to synthesise. */
  count: number
  /** Region slug (recorded in the output). */
  region: string
  /** Photo-seed offset so each region gets distinct synthetic photo URLs. */
  photoSeedBase: number
  /** Seed for the PRNG. */
  prngSeed: number
}

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

const STREET_TYPES = [
  'Road', 'Street', 'Lane', 'Avenue', 'Crescent', 'Mews', 'Gardens',
  'Walk', 'Place', 'Hill', 'Park', 'Drive', 'Close', 'Court',
]
const STREET_NAMES = [
  'Acacia', 'Beech', 'Cedar', 'Chestnut', 'Dorset', 'Elm', 'Fairfax',
  'Greenwood', 'Hazel', 'Ivy', 'Juniper', 'Kingsley', 'Linden', 'Maple',
  'Newgate', 'Oakwood', 'Primrose', 'Queens', 'Rowan', 'Sycamore',
  'Trinity', 'Underhill', 'Victoria', 'Willow', 'York', 'Aston',
  'Selly', 'Edgbaston', 'Moseley', 'Harborne', 'Bournville',
]

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

export function generateListings(opts: ListingsGenerationOptions) {
  const rand = mulberry32(opts.prngSeed)
  const pick = <T,>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]
  const jitter = (v: number, pct: number) => v * (1 + (rand() - 0.5) * 2 * pct)

  function postcodePrefix(lat: number, lng: number): string {
    for (const a of opts.postcodeAreas) {
      if (lat >= a.south && lat <= a.north && lng >= a.west && lng <= a.east) {
        return a.prefix
      }
    }
    return opts.fallbackPostcode
  }
  function postcodeFor(lat: number, lng: number): string {
    const area = postcodePrefix(lat, lng)
    const district = 1 + Math.floor(rand() * 30)
    const sector = Math.floor(rand() * 10)
    const unit =
      String.fromCharCode(65 + Math.floor(rand() * 26)) +
      String.fromCharCode(65 + Math.floor(rand() * 26))
    return `${area}${district} ${sector}${unit}`
  }

  function addressLine(): string {
    const n = 1 + Math.floor(rand() * 240)
    return `${n} ${pick(STREET_NAMES)} ${pick(STREET_TYPES)}`
  }

  function epcFromBuildPeriod(rand01: number): Listing['epc'] {
    if (rand01 < 0.05) return 'A'
    if (rand01 < 0.17) return 'B'
    if (rand01 < 0.52) return 'C'
    if (rand01 < 0.82) return 'D'
    if (rand01 < 0.95) return 'E'
    if (rand01 < 0.99) return 'F'
    return 'G'
  }

  const seed = JSON.parse(readFileSync(opts.seedPath, 'utf-8')) as SeedFile

  // Build weighted sampling pool: bias toward mid-priced, decent-PTAL cells.
  const pool: Array<{ h3: string; lat: number; lng: number; weight: number }> = []
  for (const cell of seed.cells) {
    const [lat, lng] = cellToLatLng(cell.h3)
    const priceScore = Number(cell.scores.median_price ?? 50)
    const ptalScore = Number(cell.scores.ptal ?? 50)
    const midPriceBias = 1 - Math.abs(priceScore - 60) / 60
    const w = Math.max(0.05, midPriceBias * 0.5 + ptalScore / 100)
    pool.push({ h3: cell.h3, lat, lng, weight: w })
  }
  const totalW = pool.reduce((s, c) => s + c.weight, 0)
  function sample() {
    let r = rand() * totalW
    for (const c of pool) {
      r -= c.weight
      if (r <= 0) return c
    }
    return pool[pool.length - 1]
  }

  const cellByH3 = new Map(seed.cells.map((c) => [c.h3, c]))

  const listings: Listing[] = []
  for (let i = 0; i < opts.count; i++) {
    const c = sample()
    const lat = c.lat + (rand() - 0.5) * 0.005
    const lng = c.lng + (rand() - 0.5) * 0.008
    const h3 = latLngToCell(lat, lng, seed.h3Resolution)
    const cell = cellByH3.get(h3) ?? cellByH3.get(c.h3)!
    const medianPrice = Number(cell.raw.median_price) || 350_000

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

    listings.push({
      id: `${opts.region.toUpperCase().slice(0, 3)}-${(i + 1).toString().padStart(5, '0')}`,
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
      photoSeed: opts.photoSeedBase + i,
    })
  }

  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    region: opts.region,
    count: listings.length,
    listings,
  }

  mkdirSync(dirname(opts.outPath), { recursive: true })
  writeFileSync(opts.outPath, JSON.stringify(out))
  console.log(`Wrote ${opts.outPath} (${listings.length} listings).`)
}

