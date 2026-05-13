import { useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { LayerPanel } from '@/components/panels/LayerPanel'
import { ResultsPanel } from '@/components/panels/ResultsPanel'
import { MapView } from '@/components/map/MapView'
import { useUIStore } from '@/state/useUIStore'
import { useRegionStore } from '@/state/useRegionStore'

/**
 * Top-level layout: three-column workspace.
 *
 * Region-change side-effect: clear the selected cell/listing when the user
 * switches metro so the right panel doesn't stay anchored on something from
 * the previous region.
 */
export default function App() {
  const leftOpen = useUIStore((s) => s.leftPanelOpen)
  const rightOpen = useUIStore((s) => s.rightPanelOpen)
  const setSelectedH3 = useUIStore((s) => s.setSelectedH3)
  const setSelectedListingId = useUIStore((s) => s.setSelectedListingId)
  const activeRegionId = useRegionStore((s) => s.activeRegionId)

  useEffect(() => {
    setSelectedH3(null)
    setSelectedListingId(null)
  }, [activeRegionId, setSelectedH3, setSelectedListingId])

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
