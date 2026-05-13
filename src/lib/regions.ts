/**
 * Region registry. Each entry is a metro / conurbation we ship a seed
 * dataset for. The registry is small (just metadata + asset paths); the
 * heavy per-cell payloads live as static JSON in /public/data/regions/*
 * and are fetched on demand by the loader.
 *
 * Adding a new region:
 *   1. Author a seed generator under scripts/ that writes to
 *      public/data/regions/<id>.cells.json (matching the SeedFile shape)
 *      and the matching listings JSON.
 *   2. Add the metadata entry below.
 *   3. The region picker, map auto-centre, and async loader pick it up
 *      automatically.
 */
export interface RegionMeta {
  id: string
  displayName: string
  country: string
  /** Approximate bbox covered by the seed (lng/lat). */
  bbox: { west: number; south: number; east: number; north: number }
  /** Default anchor: city centre / major rail terminus. */
  anchor: { name: string; lng: number; lat: number }
  /** Default zoom for the camera fly-to. */
  defaultZoom: number
  /** Path served from /public. */
  cellsUrl: string
  listingsUrl: string
}

export const REGIONS: RegionMeta[] = [
  {
    id: 'greater-london',
    displayName: 'Greater London',
    country: 'United Kingdom',
    bbox: { west: -0.55, south: 51.28, east: 0.33, north: 51.71 },
    anchor: { name: 'Charing Cross', lng: -0.1278, lat: 51.5074 },
    defaultZoom: 10.2,
    cellsUrl: '/data/regions/greater-london.cells.json',
    listingsUrl: '/data/regions/greater-london.listings.json',
  },
  {
    id: 'west-midlands',
    displayName: 'West Midlands',
    country: 'United Kingdom',
    bbox: { west: -2.30, south: 52.28, east: -1.30, north: 52.72 },
    anchor: { name: 'Birmingham New Street', lng: -1.8998, lat: 52.4778 },
    defaultZoom: 9.5,
    cellsUrl: '/data/regions/west-midlands.cells.json',
    listingsUrl: '/data/regions/west-midlands.listings.json',
  },
]

export const REGIONS_BY_ID: Record<string, RegionMeta> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
)

export const DEFAULT_REGION_ID = REGIONS[0].id
