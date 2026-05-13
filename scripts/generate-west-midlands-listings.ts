/**
 * Generate synthetic West Midlands listings.
 *
 * Run: npm run seed:listings:wm
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateListings, type PostcodeArea } from './lib/listings-generator'

// Postcode area prefixes covering the WM conurbation.
const POSTCODE_AREAS: PostcodeArea[] = [
  // Birmingham (B)
  { prefix: 'B',  west: -2.05, south: 52.35, east: -1.70, north: 52.60 },
  // Coventry (CV)
  { prefix: 'CV', west: -1.65, south: 52.35, east: -1.35, north: 52.50 },
  // Walsall (WS)
  { prefix: 'WS', west: -2.10, south: 52.55, east: -1.90, north: 52.70 },
  // Wolverhampton (WV)
  { prefix: 'WV', west: -2.25, south: 52.55, east: -2.05, north: 52.70 },
  // Dudley (DY)
  { prefix: 'DY', west: -2.25, south: 52.42, east: -2.05, north: 52.55 },
  // West Bromwich / Sandwell (B70+, but use B for simplicity)
  // Sutton Coldfield (B72-B76 area covered above)
]

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

generateListings({
  seedPath: resolve(__dirname, '../public/data/regions/west-midlands.cells.json'),
  outPath: resolve(__dirname, '../public/data/regions/west-midlands.listings.json'),
  postcodeAreas: POSTCODE_AREAS,
  fallbackPostcode: 'B',
  count: 220,
  region: 'west-midlands',
  photoSeedBase: 600,
  prngSeed: 8101,
})
