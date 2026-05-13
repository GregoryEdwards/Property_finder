/**
 * The weight profile is the single most important piece of app state.
 * Every slider move triggers a re-derivation of the suitability map, so this
 * store is shaped for minimum-churn updates:
 *   - `weights` and `enabled` are keyed by criterion id; setters touch only
 *     the field that changed, leaving identity-stable references elsewhere.
 *   - constraints are stored as a flat array; constraint edits replace the
 *     array (uncommon enough that we don't bother with per-id diffing).
 */
import { create } from 'zustand'
import { CRITERIA, PRESETS_BY_ID } from '@/lib/catalog'
import type { HardConstraint, WeightProfile } from '@/lib/types'

interface ProfileState extends WeightProfile {
  setWeight: (criterionId: string, weight: number) => void
  setEnabled: (criterionId: string, enabled: boolean) => void
  setConstraints: (constraints: HardConstraint[]) => void
  applyPreset: (presetId: string) => void
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

export const useProfileStore = create<ProfileState>((set) => ({
  ...defaultProfile(),
  setWeight: (criterionId, weight) =>
    set((s) => ({ weights: { ...s.weights, [criterionId]: weight } })),
  setEnabled: (criterionId, enabled) =>
    set((s) => ({ enabled: { ...s.enabled, [criterionId]: enabled } })),
  setConstraints: (constraints) => set({ constraints }),
  applyPreset: (presetId) => {
    const preset = PRESETS_BY_ID[presetId]
    if (!preset) return
    const enabled: Record<string, boolean> = {}
    for (const c of CRITERIA) enabled[c.id] = (preset.weights[c.id] ?? 0) > 0
    set({
      id: preset.id,
      name: preset.name,
      weights: { ...preset.weights },
      enabled,
      constraints: preset.constraints ? [...preset.constraints] : [],
    })
  },
  resetToDefaults: () => set(defaultProfile()),
}))
