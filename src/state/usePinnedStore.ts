/**
 * Pinned-properties store — user-added listings they want scored against
 * their profile.
 *
 * Persisted to `localStorage` (`homesite.pinned.v1`). Region-tagging and
 * H3 indexing happen at save time so listing the pins is cheap (no
 * recomputation on every render).
 *
 * CRUD shape:
 *   - add({ lat, lng, name, ... }) → generates id, regionId, h3
 *   - update(id, partial) — refreshes updatedAt; recomputes regionId+h3
 *     if coordinates changed
 *   - remove(id)
 *   - clear() — full wipe (rarely used; in the UI surfaced via a
 *     confirmation button)
 *
 * H3 resolution: pinned coords use the same resolution as the seed data
 * (8) so the scoring lookup is `resultsByH3.get(pin.h3)`. If we ever
 * change resolution per-region, this constant moves to `regions.ts`.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { latLngToCell } from 'h3-js'
import { regionForCoords } from '@/lib/regions'
import type { PinnedProperty } from '@/lib/types'

const H3_RES = 8

/** Crypto-strong id when available, with a non-secure fallback. */
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `pin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Build the derived geometry fields from raw lat/lng. */
function deriveGeo(lat: number, lng: number): {
  h3: string | null
  regionId: string | null
} {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { h3: null, regionId: null }
  }
  return {
    h3: latLngToCell(lat, lng, H3_RES),
    regionId: regionForCoords(lat, lng),
  }
}

/** Fields accepted when adding a pin. id / addedAt / updatedAt / h3 /
 *  regionId are populated by the store. */
export type NewPinInput = Omit<
  PinnedProperty,
  'id' | 'addedAt' | 'updatedAt' | 'h3' | 'regionId'
>

interface PinnedState {
  pins: PinnedProperty[]
  add: (input: NewPinInput) => PinnedProperty
  update: (id: string, patch: Partial<NewPinInput>) => void
  remove: (id: string) => void
  clear: () => void
}

export const usePinnedStore = create<PinnedState>()(
  persist(
    (set, get) => ({
      pins: [],
      add: (input) => {
        const now = new Date().toISOString()
        const geo = deriveGeo(input.lat, input.lng)
        const pin: PinnedProperty = {
          ...input,
          ...geo,
          id: newId(),
          addedAt: now,
          updatedAt: now,
        }
        set({ pins: [pin, ...get().pins] })
        return pin
      },
      update: (id, patch) => {
        const now = new Date().toISOString()
        set({
          pins: get().pins.map((p) => {
            if (p.id !== id) return p
            const next: PinnedProperty = { ...p, ...patch, updatedAt: now }
            // If coords changed, recompute h3 + regionId.
            if (
              (patch.lat !== undefined && patch.lat !== p.lat) ||
              (patch.lng !== undefined && patch.lng !== p.lng)
            ) {
              const geo = deriveGeo(next.lat, next.lng)
              next.h3 = geo.h3
              next.regionId = geo.regionId
            }
            return next
          }),
        })
      },
      remove: (id) => set({ pins: get().pins.filter((p) => p.id !== id) }),
      clear: () => set({ pins: [] }),
    }),
    {
      name: 'homesite.pinned.v1',
      version: 1,
    },
  ),
)
