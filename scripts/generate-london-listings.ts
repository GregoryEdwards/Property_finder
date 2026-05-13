/**
 * Generate synthetic Greater London listings.
 *
 * Phase 1 placeholder; Phase 2 swaps for a real Rightmove / Zoopla feed.
 *
 * Run: npm run seed:listings:london
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateListings, type PostcodeArea } from './lib/listings-generator'

const POSTCODE_AREAS: PostcodeArea[] = [
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

generateListings({
  seedPath: resolve(__dirname, '../public/data/regions/greater-london.cells.json'),
  outPath: resolve(__dirname, '../public/data/regions/greater-london.listings.json'),
  postcodeAreas: POSTCODE_AREAS,
  fallbackPostcode: 'SE',
  count: 240,
  region: 'greater-london',
  photoSeedBase: 200,
  prngSeed: 4093,
})
