/**
 * The weight profile is the single most important piece of app state.
 * Every slider move triggers a re-derivation of the suitability map, so this
 * store is shaped for minimum-churn updates and is persisted to localStorage
 * so users don't lose their tuned profile on refresh.
 *
 * Persistence intentionally stores only the profile fields (weights / enabled
 * / constraints / id / name); store-action references are stripped via the
 * `partialize` config.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CRITERIA, PRESETS_BY_ID } from '@/lib/catalog'
import type { CriterionId, HardConstraint, WeightProfile } from '@/lib/types'

interface ProfileState extends WeightProfile {
  setWeight: (criterionId: CriterionId, weight: number) => void
  setEnabled: (criterionId: CriterionId, enabled: boolean) => void
  setOrderedRank: (orderedIds: CriterionId[]) => void
  setConstraints: (constraints: HardConstraint[]) => void
  toggleConstraintCategory: (
    criterionId: CriterionId,
    category: string,
  ) => void
  applyPreset: (presetId: string) => void
  rename: (name: string) => void
  resetToDefaults: () => void
}

const defaultProfile = (): WeightProfile => {
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
  }
}

/**
 * Translate a drag-to-rank ordering of currently-enabled criteria into
 * weights via the rank-reciprocal scheme:
 *
 *     w_i ∝ 1 / rank_i
 *
 * Scaled to the 0..10 UI range so the slider view shows comparable numbers
 * when the user switches back.
 */
function weightsFromRank(
  orderedIds: CriterionId[],
  prevWeights: Record<string, number>,
): Record<string, number> {
  const w: Record<string, number> = { ...prevWeights }
  let maxNorm = 0
  const norm: number[] = []
  for (let i = 0; i < orderedIds.length; i++) {
    norm.push(1 / (i + 1))
    if (norm[i] > maxNorm) maxNorm = norm[i]
  }
  // Scale top rank to ~10, floor to 1 for visibility.
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    const scaled = (norm[i] / maxNorm) * 10
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
        set((s) => ({ weights: weightsFromRank(orderedIds, s.weights) })),
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
      }),
    },
  ),
)
