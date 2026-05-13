/**
 * Favourites — saved listings + saved profiles, persisted to localStorage.
 *
 * Phase 1 keeps everything local. Phase 2 sync this to the backend per
 * user account.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeightProfile } from '@/lib/types'

interface FavouritesState {
  favouriteListingIds: string[]
  toggleListing: (id: string) => void
  clearListings: () => void

  /** Saved (cloned) profiles. The active profile lives in useProfileStore. */
  savedProfiles: WeightProfile[]
  saveProfile: (profile: WeightProfile) => void
  deleteProfile: (id: string) => void
}

export const useFavouritesStore = create<FavouritesState>()(
  persist(
    (set, get) => ({
      favouriteListingIds: [],
      toggleListing: (id) => {
        const set_ = new Set(get().favouriteListingIds)
        if (set_.has(id)) set_.delete(id)
        else set_.add(id)
        set({ favouriteListingIds: Array.from(set_) })
      },
      clearListings: () => set({ favouriteListingIds: [] }),

      savedProfiles: [],
      saveProfile: (profile) => {
        const existing = get().savedProfiles
        const replaced = existing.filter((p) => p.id !== profile.id)
        set({ savedProfiles: [...replaced, profile] })
      },
      deleteProfile: (id) =>
        set({ savedProfiles: get().savedProfiles.filter((p) => p.id !== id) }),
    }),
    {
      name: 'homesite.favourites.v1',
      version: 1,
    },
  ),
)
