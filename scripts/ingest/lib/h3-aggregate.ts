/**
 * Aggregate per-point values into H3 cells at a fixed resolution.
 *
 * The point-aggregation pattern is reused by most Tier-1 criteria
 * (median_price, crime_rate, broadband_speed, …). Inputs come in as
 * {lat, lng, value}; outputs are an aggregator-reduced value per H3 cell.
 */
import { latLngToCell } from 'h3-js'
import type { H3Index } from '../../../src/lib/types'

export interface PointValue {
  lat: number
  lng: number
  value: number
}

/** Group point values by H3 cell at the given resolution. */
export function groupPointsByH3(
  points: Iterable<PointValue>,
  h3Resolution: number,
  cellAllowList?: Set<H3Index>,
): Map<H3Index, number[]> {
  const out = new Map<H3Index, number[]>()
  for (const p of points) {
    const h3 = latLngToCell(p.lat, p.lng, h3Resolution)
    if (cellAllowList && !cellAllowList.has(h3)) continue
    let arr = out.get(h3)
    if (!arr) {
      arr = []
      out.set(h3, arr)
    }
    arr.push(p.value)
  }
  return out
}

/** Median of a non-empty numeric array. */
export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median: empty array')
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}
