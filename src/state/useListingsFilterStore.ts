/**
 * Listings discovery state — filter, sort, postcode search, viewport scope.
 *
 * Kept *separate* from useUIStore even though both are ephemeral, because:
 *   - changes here re-run the expensive filter+sort+viewport intersection
 *     on every keystroke, so consumers selectively subscribe
 *   - it's persisted to localStorage so a refresh keeps the user's
 *     active filter set — discovery is iterative, refreshing shouldn't
 *     reset it
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Listing } from '@/lib/types'

export type SortKey =
  | 'suitability_desc'
  | 'price_asc'
  | 'price_desc'
  | 'beds_desc'
  | 'newest'
  | 'days_on_market_asc'

export interface MapViewport {
  west: number
  south: number
  east: number
  north: number
}

interface ListingsFilterState {
  /** Sort order applied after filters. */
  sort: SortKey
  /** Free-text postcode prefix filter (case-insensitive). */
  postcodeQuery: string
  /** £ price min/max. Null means "no bound". */
  minPrice: number | null
  maxPrice: number | null
  /** Bedroom range. Null means "no bound". */
  minBeds: number | null
  maxBeds: number | null
  /** EPC band cutoff: include only A..<this>. Null = any. */
  minEpc: Listing['epc'] | null
  /** Property types to include. Empty = include all. */
  propertyTypes: Set<Listing['propertyType']>
  /** Tenures to include. Empty = include all. */
  tenures: Set<Listing['tenure']>
  /** When true, only listings whose lng/lat fall inside the current
   *  map viewport bbox are shown. */
  viewportOnly: boolean
  /** Latest map viewport, kept fresh by MapView. Optional —
   *  used only when viewportOnly is true. */
  currentViewport: MapViewport | null

  /** Setters. */
  setSort: (s: SortKey) => void
  setPostcodeQuery: (q: string) => void
  setPriceRange: (min: number | null, max: number | null) => void
  setBedsRange: (min: number | null, max: number | null) => void
  setMinEpc: (epc: Listing['epc'] | null) => void
  togglePropertyType: (t: Listing['propertyType']) => void
  toggleTenure: (t: Listing['tenure']) => void
  setViewportOnly: (v: boolean) => void
  setCurrentViewport: (v: MapViewport | null) => void
  reset: () => void
}

const defaults = () => ({
  sort: 'suitability_desc' as SortKey,
  postcodeQuery: '',
  minPrice: null as number | null,
  maxPrice: null as number | null,
  minBeds: null as number | null,
  maxBeds: null as number | null,
  minEpc: null as Listing['epc'] | null,
  propertyTypes: new Set<Listing['propertyType']>(),
  tenures: new Set<Listing['tenure']>(),
  viewportOnly: false,
  currentViewport: null as MapViewport | null,
})

export const useListingsFilterStore = create<ListingsFilterState>()(
  persist(
    (set, get) => ({
      ...defaults(),
      setSort: (sort) => set({ sort }),
      setPostcodeQuery: (postcodeQuery) => set({ postcodeQuery }),
      setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),
      setBedsRange: (minBeds, maxBeds) => set({ minBeds, maxBeds }),
      setMinEpc: (minEpc) => set({ minEpc }),
      togglePropertyType: (t) => {
        const next = new Set(get().propertyTypes)
        if (next.has(t)) next.delete(t)
        else next.add(t)
        set({ propertyTypes: next })
      },
      toggleTenure: (t) => {
        const next = new Set(get().tenures)
        if (next.has(t)) next.delete(t)
        else next.add(t)
        set({ tenures: next })
      },
      setViewportOnly: (viewportOnly) => set({ viewportOnly }),
      setCurrentViewport: (currentViewport) => set({ currentViewport }),
      reset: () => set(defaults()),
    }),
    {
      name: 'homesite.listings-filter.v1',
      version: 1,
      // currentViewport is updated continuously by MapView; persisting it
      // would just write garbage on every pan. Strip it from persistence.
      partialize: (s) => ({
        sort: s.sort,
        postcodeQuery: s.postcodeQuery,
        minPrice: s.minPrice,
        maxPrice: s.maxPrice,
        minBeds: s.minBeds,
        maxBeds: s.maxBeds,
        minEpc: s.minEpc,
        propertyTypes: Array.from(s.propertyTypes),
        tenures: Array.from(s.tenures),
        viewportOnly: s.viewportOnly,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ListingsFilterState> & {
          propertyTypes?: Listing['propertyType'][]
          tenures?: Listing['tenure'][]
        }
        return {
          ...current,
          ...p,
          propertyTypes: new Set(p.propertyTypes ?? []),
          tenures: new Set(p.tenures ?? []),
        }
      },
    },
  ),
)
