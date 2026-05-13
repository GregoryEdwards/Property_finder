/**
 * Active-region selector. Tiny store: just an id. The fetches are driven by
 * TanStack Query keyed on the active region id.
 *
 * Persisted so a refresh keeps the user on the region they were exploring.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_REGION_ID, REGIONS_BY_ID } from '@/lib/regions'

interface RegionState {
  activeRegionId: string
  setActiveRegion: (id: string) => void
}

export const useRegionStore = create<RegionState>()(
  persist(
    (set) => ({
      activeRegionId: DEFAULT_REGION_ID,
      setActiveRegion: (id) => {
        if (!REGIONS_BY_ID[id]) return
        set({ activeRegionId: id })
      },
    }),
    {
      name: 'homesite.region.v1',
      version: 1,
    },
  ),
)
