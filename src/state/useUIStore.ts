/**
 * Ephemeral UI state — not persisted.
 */
import { create } from 'zustand'

export type BasemapId = 'dark' | 'light' | 'satellite'
export type PriorityView = 'slider' | 'rank'
export type RightTab = 'inspect' | 'listings' | 'favourites'

interface UIState {
  /** H3 index of the currently-selected cell (drives the explanation popover). */
  selectedH3: string | null
  setSelectedH3: (h3: string | null) => void

  /** The listing the user opened from the map or the right panel. */
  selectedListingId: string | null
  setSelectedListingId: (id: string | null) => void

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
  setSelectedH3: (h3) => set({ selectedH3: h3, selectedListingId: null }),

  selectedListingId: null,
  setSelectedListingId: (id) =>
    set({ selectedListingId: id, rightTab: id ? 'inspect' : 'inspect' }),

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
