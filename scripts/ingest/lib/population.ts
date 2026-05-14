/**
 * Region population helpers.
 *
 * Ratio metrics like `crime_rate` (crimes per 1,000 residents per year) need
 * a per-cell population denominator. Phase 2.1 ships a deliberately crude v1:
 * each region's total population is split uniformly across all its H3 cells.
 *
 * This is good enough to land the catalog's expected units (population in the
 * thousands per cell, crime rates of tens to low hundreds per 1k/yr) but it
 * does not capture intra-region density gradients — Mayfair and the M25 fringe
 * get the same denominator. Phase 2.x will replace this with ONS LSOA
 * mid-year estimates distributed by polygon-area intersection with each cell.
 *
 * Source for the totals: ONS mid-2023 population estimates for the GLA area
 * and the West Midlands metropolitan county.
 */

const REGION_TOTAL_POPULATION: Record<string, number> = {
  // Greater London (admin area). The seed bbox extends slightly past the M25
  // into the inner home counties, so this very mildly under-counts the bbox
  // population — adequate for the proof of concept.
  'greater-london': 8_900_000,
  // West Midlands metropolitan county (Birmingham + Coventry + Wolverhampton +
  // Solihull + Sandwell + Dudley + Walsall).
  'west-midlands': 2_940_000,
}

/**
 * Uniform-density per-cell population estimate.
 * Returns 0 for unknown regions or empty cell lists.
 */
export function populationPerCell(
  regionId: string,
  totalCellCount: number,
): number {
  const total = REGION_TOTAL_POPULATION[regionId]
  if (!total || totalCellCount <= 0) return 0
  return total / totalCellCount
}

export function regionTotalPopulation(regionId: string): number {
  return REGION_TOTAL_POPULATION[regionId] ?? 0
}
