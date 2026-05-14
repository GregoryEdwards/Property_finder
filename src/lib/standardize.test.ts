import { describe, expect, it } from 'vitest'
import { standardize } from './standardize'
import type { Transform } from './types'

describe('standardize', () => {
  describe('linear', () => {
    const t: Transform = { type: 'linear', min: 22_000, max: 75_000 }

    it('clamps below min to 0 for more_is_better', () => {
      expect(standardize(10_000, t, 'more_is_better')).toBe(0)
    })

    it('clamps above max to 100 for more_is_better', () => {
      expect(standardize(100_000, t, 'more_is_better')).toBe(100)
    })

    it('inverts for less_is_better', () => {
      expect(standardize(t.max, t, 'less_is_better')).toBe(0)
      expect(standardize(t.min, t, 'less_is_better')).toBe(100)
    })
  })

  describe('fuzzy_decay', () => {
    const t: Transform = {
      type: 'fuzzy_decay',
      idealMax: 30,
      acceptableMax: 200,
      curve: 'linear',
    }

    it('returns 100 at or below ideal', () => {
      expect(standardize(10, t, 'less_is_better')).toBe(100)
      expect(standardize(30, t, 'less_is_better')).toBe(100)
    })

    it('returns 0 at or above acceptable', () => {
      expect(standardize(200, t, 'less_is_better')).toBe(0)
      expect(standardize(1000, t, 'less_is_better')).toBe(0)
    })

    it('falls off linearly between bounds', () => {
      // Midpoint between 30 and 200 is 115; expected score = 50.
      expect(standardize(115, t, 'less_is_better')).toBeCloseTo(50, 0)
    })
  })

  describe('categorical', () => {
    const t: Transform = {
      type: 'categorical',
      mapping: { OUTSTANDING: 100, GOOD: 75, REQUIRES_IMPROVEMENT: 35, INADEQUATE: 0 },
    }

    it('looks up by raw string key', () => {
      expect(standardize('OUTSTANDING', t, 'category')).toBe(100)
      expect(standardize('GOOD', t, 'category')).toBe(75)
    })

    it('returns 0 for an unknown key', () => {
      expect(standardize('UNKNOWN', t, 'category')).toBe(0)
    })
  })
})
