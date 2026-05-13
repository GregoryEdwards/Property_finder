/**
 * The weight profile is the single most important piece of app state.
 * Every slider move triggers a re-derivation of the suitability map, so this
 * store is shaped for minimum-churn updates and is persisted to localStorage
 * so users don't lose their tuned profile on refresh.
 *
 * Persistence intentionally stores only the profile fields (weights / enabled
 * / constraints / id / name / rankScheme); store-action references are
 * stripped via the `partialize` config.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CRITERIA, PRESETS_BY_ID } from '@/lib/catalog'
import type { CriterionId, HardConstraint, WeightProfile } from '@/lib/types'

/**
 * Choice of rank-to-weights translation when the user reorders criteria in
 * the Ranked mode. Two schemes:
 *
 *   - `reciprocal`  (default; the original algorithm)
 *       w_i ∝ 1 / rank_i
 *     Steep differential — top rank dominates. Rank 1 ≈ 10, rank 2 ≈ 5,
 *     rank 3 ≈ 3, rank 4 ≈ 2, rank 5+ ≈ 1.
 *
 *   - `linear`  (rank-sum)
 *       w_i ∝ (N - rank_i + 1)
 *     Gentle differential — weights step down by one per rank. Useful
 *     when the user wants ranking to influence but not dominate.
 *
 * Both are standard schemes from MCDA literature for converting an ordinal
 * priority ranking into a cardinal weight vector. We expose both so the
 * user can pick the differential that matches their intent.
 */
export type RankScheme = 'reciprocal' | 'linear'

interface ProfileState extends WeightProfile {
  /** Active rank-to-weights translation used by `setOrderedRank`. */
  rankScheme: RankScheme

  setWeight: (criterionId: CriterionId, weight: number) => void
  setEnabled: (criterionId: CriterionId, enabled: boolean) => void
  /** Reorder the enabled criteria from most → least important. Writes
   *  weights via the currently-active `rankScheme`. */
  setOrderedRank: (orderedIds: CriterionId[]) => void
  setRankScheme: (scheme: RankScheme) => void
  setConstraints: (constraints: HardConstraint[]) => void
  toggleConstraintCategory: (
    criterionId: CriterionId,
    category: string,
  ) => void
  applyPreset: (presetId: string) => void
  rename: (name: string) => void
  resetToDefaults: () => void
}

const defaultProfile = (): WeightProfile & { rankScheme: RankScheme } => {
  const weights: Record<string, number> = {}
  const enabled: Record<string, boolean> = {}
  for (const c of CRITERIA) {
    weights[c.id] = c.defaultWeight
    enabled[c.id] = c.defaultEnabled
  }
  return {
    id: 'default',
    name: 'Untitled profile',
    weights,
    enabled,
    constraints: [],
    rankScheme: 'reciprocal',
  }
}

/**
 * Translate a drag-to-rank ordering into weights using the active scheme.
 * Output is scaled to the 0..10 UI range so the slider view shows
 * comparable numbers when the user switches back to Manual mode.
 */
function weightsFromRank(
  orderedIds: CriterionId[],
  scheme: RankScheme,
  prevWeights: Record<string, number>,
): Record<string, number> {
  const w: Record<string, number> = { ...prevWeights }
  const n = orderedIds.length
  if (n === 0) return w

  // Compute the raw scheme value for each rank index (0..n-1).
  const raw: number[] = []
  for (let i = 0; i < n; i++) {
    if (scheme === 'reciprocal') {
      raw.push(1 / (i + 1))
    } else {
      // linear / rank-sum: top rank gets N, second N-1, …, last gets 1.
      raw.push(n - i)
    }
  }
  const maxRaw = raw.reduce((m, v) => (v > m ? v : m), 0)

  // Scale top to ~10, floor to 1 so even bottom ranks remain visible
  // on the slider.
  for (let i = 0; i < n; i++) {
    const id = orderedIds[i]
    const scaled = (raw[i] / maxRaw) * 10
    w[id] = Math.max(1, Math.round(scaled))
  }
  return w
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...defaultProfile(),
      setWeight: (criterionId, weight) =>
        set((s) => ({ weights: { ...s.weights, [criterionId]: weight } })),
      setEnabled: (criterionId, enabled) =>
        set((s) => ({ enabled: { ...s.enabled, [criterionId]: enabled } })),
      setOrderedRank: (orderedIds) =>
        set((s) => ({
          weights: weightsFromRank(orderedIds, s.rankScheme, s.weights),
        })),
      setRankScheme: (scheme) => set({ rankScheme: scheme }),
      setConstraints: (constraints) => set({ constraints }),
      toggleConstraintCategory: (criterionId, category) => {
        const current = get().constraints
        const idx = current.findIndex((c) => c.criterionId === criterionId)
        let next: HardConstraint[]
        if (idx === -1) {
          next = [
            ...current,
            { criterionId, excludeCategories: [category] },
          ]
        } else {
          const existing = current[idx]
          const cats = new Set(existing.excludeCategories ?? [])
          if (cats.has(category)) cats.delete(category)
          else cats.add(category)
          if (cats.size === 0) {
            next = current.filter((_, i) => i !== idx)
          } else {
            const updated = {
              ...existing,
              excludeCategories: Array.from(cats),
            }
            next = current.map((c, i) => (i === idx ? updated : c))
          }
        }
        set({ constraints: next })
      },
      applyPreset: (presetId) => {
        const preset = PRESETS_BY_ID[presetId]
        if (!preset) return
        const enabled: Record<string, boolean> = {}
        for (const c of CRITERIA)
          enabled[c.id] = (preset.weights[c.id] ?? 0) > 0
        set({
          id: preset.id,
          name: preset.name,
          weights: { ...preset.weights },
          enabled,
          constraints: preset.constraints ? [...preset.constraints] : [],
        })
      },
      rename: (name) => set({ name }),
      resetToDefaults: () => set(defaultProfile()),
    }),
    {
      name: 'homesite.profile.v1',
      version: 1,
      partialize: (s) => ({
        id: s.id,
        name: s.name,
        weights: s.weights,
        enabled: s.enabled,
        constraints: s.constraints,
        rankScheme: s.rankScheme,
      }),
    },
  ),
)
