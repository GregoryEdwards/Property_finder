/**
 * Ephemeral UI state — not persisted, not synced. Things like the currently
 * focused cell, opacity slider, panel collapse state, basemap selection.
 */
import { create } from 'zustand'

export type BasemapId = 'dark' | 'light' | 'satellite'

interface UIState {
  /** H3 index of the currently-selected cell (drives the explanation popover). */
  selectedH3: string | null
  setSelectedH3: (h3: string | null) => void

  /** Opacity 0..1 for the suitability heatmap overlay. */
  heatmapOpacity: number
  setHeatmapOpacity: (v: number) => void

  /** Whether to show only cells above this score (top-zones highlighting). */
  topZonesThreshold: number | null
  setTopZonesThreshold: (v: number | null) => void

  /** Basemap selection. */
  basemap: BasemapId
  setBasemap: (b: BasemapId) => void

  /** Left/right panel collapse. */
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  setLeftPanelOpen: (v: boolean) => void
  setRightPanelOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedH3: null,
  setSelectedH3: (h3) => set({ selectedH3: h3 }),
  heatmapOpacity: 0.6,
  setHeatmapOpacity: (v) => set({ heatmapOpacity: v }),
  topZonesThreshold: null,
  setTopZonesThreshold: (v) => set({ topZonesThreshold: v }),
  basemap: 'dark',
  setBasemap: (b) => set({ basemap: b }),
  leftPanelOpen: true,
  rightPanelOpen: true,
  setLeftPanelOpen: (v) => set({ leftPanelOpen: v }),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
}))
