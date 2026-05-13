import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Idiomatic shadcn-style className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Format a raw value for display in the tooltip. */
export function formatRaw(value: number | string, unit: string): string {
  if (typeof value === 'string') return value
  if (unit === 'USD') {
    return `$${Math.round(value).toLocaleString()}`
  }
  if (unit === 'minutes') {
    return `${value.toFixed(0)} min`
  }
  if (unit === '1-10') {
    return value.toFixed(1)
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  return value.toFixed(1)
}
