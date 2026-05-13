import { useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { LayerPanel } from '@/components/panels/LayerPanel'
import { ResultsPanel } from '@/components/panels/ResultsPanel'
import { MapView } from '@/components/map/MapView'
import { useUIStore } from '@/state/useUIStore'
import { useRegionStore } from '@/state/useRegionStore'

/**
 * Map workspace — the three-column layout originally lived in App.tsx.
 * Extracted so App.tsx can be the router shell with map + methodology
 * routes.
 */
export default function MapApp() {
  const leftOpen = useUIStore((s) => s.leftPanelOpen)
  const rightOpen = useUIStore((s) => s.rightPanelOpen)
  const setSelectedH3 = useUIStore((s) => s.setSelectedH3)
  const setSelectedListingId = useUIStore((s) => s.setSelectedListingId)
  const setSelectedPinnedId = useUIStore((s) => s.setSelectedPinnedId)
  const setPinDropMode = useUIStore((s) => s.setPinDropMode)
  const activeRegionId = useRegionStore((s) => s.activeRegionId)

  // Clear all selections + cancel pin-drop on region change. Stale ids
  // from another region would otherwise scroll the results panel to
  // entries that aren't on the visible map.
  useEffect(() => {
    setSelectedH3(null)
    setSelectedListingId(null)
    setSelectedPinnedId(null)
    setPinDropMode(false)
  }, [
    activeRegionId,
    setSelectedH3,
    setSelectedListingId,
    setSelectedPinnedId,
    setPinDropMode,
  ])

  return (
    <div className="flex h-screen w-screen flex-col bg-bg-base">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {leftOpen && <LayerPanel />}
        <main className="relative flex-1 overflow-hidden">
          <MapView />
        </main>
        {rightOpen && <ResultsPanel />}
      </div>
    </div>
  )
}
