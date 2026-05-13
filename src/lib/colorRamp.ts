/**
 * Suitability color ramp — Viridis (perceptually uniform, color-blind safe).
 *
 * Sampled from the canonical Viridis colormap at 11 stops. We interpolate
 * linearly between stops at runtime. Both deck.gl (RGBA tuple) and CSS
 * (hex string) consumers are supported.
 *
 * Requirements §6.4 cartography explicitly mandates a perceptually uniform
 * sequential palette and forbids rainbow/jet.
 */

const VIRIDIS_STOPS: Array<[number, number, number]> = [
  [68, 1, 84],
  [72, 35, 116],
  [64, 67, 135],
  [52, 94, 141],
  [41, 120, 142],
  [32, 144, 140],
  [34, 167, 132],
  [68, 190, 112],
  [121, 209, 81],
  [189, 222, 38],
  [253, 231, 36],
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Sample the ramp at t ∈ [0, 1]. Returns [r, g, b] in 0..255. */
export function viridisRGB(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t))
  const scaled = clamped * (VIRIDIS_STOPS.length - 1)
  const i = Math.floor(scaled)
  const f = scaled - i
  if (i >= VIRIDIS_STOPS.length - 1) {
    const [r, g, b] = VIRIDIS_STOPS[VIRIDIS_STOPS.length - 1]
    return [r, g, b]
  }
  const a = VIRIDIS_STOPS[i]
  const b = VIRIDIS_STOPS[i + 1]
  return [
    Math.round(lerp(a[0], b[0], f)),
    Math.round(lerp(a[1], b[1], f)),
    Math.round(lerp(a[2], b[2], f)),
  ]
}

/** Sample the ramp at score ∈ [0, 100]. Returns [r, g, b, a] for deck.gl. */
export function suitabilityRGBA(
  score: number | null,
  opacity = 153, // 60% over basemap, per requirements §6.4
): [number, number, number, number] {
  if (score === null || Number.isNaN(score)) return [0, 0, 0, 0]
  const [r, g, b] = viridisRGB(score / 100)
  return [r, g, b, opacity]
}

/** Hex string for CSS — used by the legend. */
export function viridisHex(t: number): string {
  const [r, g, b] = viridisRGB(t)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Discrete legend stops at 0, 25, 50, 75, 100. */
export const LEGEND_STOPS = [0, 25, 50, 75, 100] as const
