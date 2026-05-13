/**
 * Live normalised weight vector for the active profile.
 *
 * Exposes the same `Σ wᵢ = 1` view of the world that the runtime
 * suitability engine uses, but as a React hook so any component can show
 * "this criterion is currently contributing 18% to the composite score."
 *
 * Returns:
 *   - `weights`: criterion id → share in [0..1]
 *   - `enabledCount`: how many criteria are currently active
 *   - `topId` / `topShare`: the dominant criterion (handy for the panel
 *     header summary)
 *
 * Cheap: a single useMemo against the two profile fields that affect
 * normalisation. Don't subscribe to anything else.
 */
import { useMemo } from 'react'
import { CRITERIA } from '@/lib/catalog'
import { normalizeWeights } from '@/lib/suitability'
import type { WeightProfile } from '@/lib/types'
import { useProfileStore } from './useProfileStore'

interface NormalizedView {
  weights: Record<string, number>
  enabledCount: number
  topId: string | null
  topShare: number
}

const EMPTY: NormalizedView = {
  weights: {},
  enabledCount: 0,
  topId: null,
  topShare: 0,
}

export function useNormalizedWeights(): NormalizedView {
  const profileWeights = useProfileStore((s) => s.weights)
  const enabled = useProfileStore((s) => s.enabled)

  return useMemo(() => {
    // Construct a minimal WeightProfile-shaped object for the normaliser.
    // `id`, `name`, `constraints` aren't read by `normalizeWeights`.
    const profile = {
      id: '',
      name: '',
      weights: profileWeights,
      enabled,
      constraints: [],
    } satisfies WeightProfile
    const weights = normalizeWeights(profile, CRITERIA)
    const enabledCount = Object.values(enabled).filter(Boolean).length
    let topId: string | null = null
    let topShare = 0
    for (const id in weights) {
      if (weights[id] > topShare) {
        topShare = weights[id]
        topId = id
      }
    }
    if (Object.keys(weights).length === 0) return EMPTY
    return { weights, enabledCount, topId, topShare }
  }, [profileWeights, enabled])
}
