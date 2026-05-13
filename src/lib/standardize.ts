/**
 * Convert raw measurements to a 0..100 standardized score using a criterion's
 * configured transform.
 *
 * This file is the boundary between *upstream* data (in native units like
 * minutes, dollars, FEMA zone codes) and *downstream* math (the WLC, which
 * expects all inputs on the same 0..100 scale).
 *
 * Used by:
 *   - scripts/generate-austin-seed.ts to bake scores into the seed file
 *   - the Phase-1 data pipeline (will reuse the same transforms)
 */
import type { CriterionDefinition, Transform } from './types'

export function standardize(
  raw: number | string,
  transform: Transform,
  direction: CriterionDefinition['direction'],
): number {
  let score: number
  switch (transform.type) {
    case 'linear': {
      const r = Number(raw)
      const { min, max } = transform
      const t = (r - min) / (max - min)
      score = 100 * Math.max(0, Math.min(1, t))
      break
    }
    case 'fuzzy_decay': {
      const r = Number(raw)
      const { idealMax, acceptableMax, curve } = transform
      if (r <= idealMax) {
        score = 100
        break
      }
      if (r >= acceptableMax) {
        score = 0
        break
      }
      const t = (r - idealMax) / (acceptableMax - idealMax) // 0..1, more = worse
      const eased = curve === 'exponential' ? t * t : t
      // fuzzy_decay is implicitly "less is better" within [ideal, acceptable]
      score = 100 * (1 - eased)
      break
    }
    case 'categorical': {
      const key = String(raw)
      score = transform.mapping[key] ?? 0
      break
    }
  }
  // For more_is_better with a linear transform, the value is already correctly
  // oriented (higher raw -> higher score). For less_is_better with linear, we
  // need to invert. fuzzy_decay is already directional. categorical is explicit.
  if (transform.type === 'linear' && direction === 'less_is_better') {
    score = 100 - score
  }
  return Math.max(0, Math.min(100, score))
}
