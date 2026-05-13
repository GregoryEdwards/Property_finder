/**
 * Ephemeral UI state — not persisted.
 */
import { create } from 'zustand'

export type BasemapId = 'dark' | 'light' | 'satellite'
export type PriorityView = 'slider' | 'rank'
export type RightTab = 'inspect' | 'listings' | 'favourites' | 'pinned'

interface UIState {
  /** H3 index of the currently-selected cell (drives the explanation popover). */
  selectedH3: string | null
  setSelectedH3: (h3: string | null) => void

  /** The listing the user opened from the map or the right panel. */
  selectedListingId: string | null
  setSelectedListingId: (id: string | null) => void

  /** A pinned property selected on the map or in the Pinned tab. */
  selectedPinnedId: string | null
  setSelectedPinnedId: (id: string | null) => void

  /** While true, the next map click drops a pin at that coordinate
   *  instead of selecting whatever is under the cursor. The MapView
   *  click handler reads this flag. */
  pinDropMode: boolean
  setPinDropMode: (v: boolean) => void

  /** Coordinates of the last map-drop, awaiting form completion.
   *  Cleared once the form saves or the user cancels. */
  pendingPinDrop: { lat: number; lng: number } | null
  setPendingPinDrop: (v: { lat: number; lng: number } | null) => void

  /** Opacity 0..1 for the suitability heatmap overlay. */
  heatmapOpacity: number
  setHeatmapOpacity: (v: number) => void

  /** Whether to show only cells above this score (top-zones highlighting). */
  topZonesThreshold: number | null
  setTopZonesThreshold: (v: number | null) => void

  /** Basemap selection. */
  basemap: BasemapId
  setBasemap: (b: BasemapId) => void

  /** Priorities panel view mode — slider vs drag-to-rank. */
  priorityView: PriorityView
  setPriorityView: (v: PriorityView) => void

  /** Right panel tab. */
  rightTab: RightTab
  setRightTab: (t: RightTab) => void

  /** Whether to show listing pins on the map. */
  showListings: boolean
  setShowListings: (v: boolean) => void

  /** Left/right panel collapse. */
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  setLeftPanelOpen: (v: boolean) => void
  setRightPanelOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedH3: null,
  setSelectedH3: (h3) =>
    set({
      selectedH3: h3,
      selectedListingId: null,
      selectedPinnedId: null,
    }),

  selectedListingId: null,
  setSelectedListingId: (id) =>
    set({
      selectedListingId: id,
      selectedPinnedId: null,
      rightTab: 'inspect',
    }),

  selectedPinnedId: null,
  setSelectedPinnedId: (id) =>
    set((s) => ({
      selectedPinnedId: id,
      selectedListingId: null,
      // Open the Pinned tab when a pin is selected so its detail is
      // immediately visible. Don't change tabs on clear.
      rightTab: id ? ('pinned' as const) : s.rightTab,
    })),

  pinDropMode: false,
  setPinDropMode: (v) => set({ pinDropMode: v }),

  pendingPinDrop: null,
  setPendingPinDrop: (v) => set({ pendingPinDrop: v }),

  heatmapOpacity: 0.6,
  setHeatmapOpacity: (v) => set({ heatmapOpacity: v }),

  topZonesThreshold: null,
  setTopZonesThreshold: (v) => set({ topZonesThreshold: v }),

  basemap: 'dark',
  setBasemap: (b) => set({ basemap: b }),

  priorityView: 'slider',
  setPriorityView: (v) => set({ priorityView: v }),

  rightTab: 'inspect',
  setRightTab: (t) => set({ rightTab: t }),

  showListings: true,
  setShowListings: (v) => set({ showListings: v }),

  leftPanelOpen: true,
  rightPanelOpen: true,
  setLeftPanelOpen: (v) => set({ leftPanelOpen: v }),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
}))
