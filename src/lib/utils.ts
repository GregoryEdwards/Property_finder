import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Idiomatic shadcn-style className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

/** £ formatter that shortens to £950k / £1.2m above thresholds. */
export function formatGBP(value: number, opts?: { short?: boolean }): string {
  if (opts?.short) {
    if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(2)}m`
    if (value >= 100_000) return `£${Math.round(value / 1000)}k`
  }
  return GBP.format(value)
}

/** Pretty-print a raw criterion value for tooltips and the explanation card. */
export function formatRaw(value: number | string, unit: string): string {
  if (typeof value === 'string') {
    // Tidy display of the FEMA-style category codes.
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  if (unit === 'GBP') return formatGBP(value, { short: true })
  if (unit === 'minutes' || unit === 'minutes (walk)') return `${value.toFixed(0)} min`
  if (unit === 'Mbps') return `${Math.round(value)} Mbps`
  if (unit === 'PTAL 0-6b') return value.toFixed(1)
  if (unit === 'µg/m³ annual mean') return `${value.toFixed(0)} µg/m³`
  if (unit === 'dB Lden') return `${value.toFixed(0)} dB`
  if (unit === 'crimes per 1k residents / yr') return `${value.toFixed(0)} per 1k`
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString('en-GB', { maximumFractionDigits: 0 })
  }
  return value.toFixed(1)
}

/** Format an EPC band as a coloured label spec. Returns the canonical EPC swatch hex. */
export function epcColor(band: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'): string {
  switch (band) {
    case 'A':
      return '#008054'
    case 'B':
      return '#19b459'
    case 'C':
      return '#8dce46'
    case 'D':
      return '#ffd500'
    case 'E':
      return '#fcaa1f'
    case 'F':
      return '#ef8023'
    case 'G':
      return '#e9153b'
  }
}
