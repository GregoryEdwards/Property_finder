import { TopBar } from '@/components/layout/TopBar'
import { LayerPanel } from '@/components/panels/LayerPanel'
import { ResultsPanel } from '@/components/panels/ResultsPanel'
import { MapView } from '@/components/map/MapView'
import { useUIStore } from '@/state/useUIStore'

/**
 * Top-level layout: three-column workspace.
 *   - Left:  Priorities / layers panel (collapsible)
 *   - Center: Map (always dominant)
 *   - Right: Results / explanation panel (collapsible)
 *
 * The map remains the cognitive surface; side panels can be hidden to give
 * it the whole viewport.
 */
export default function App() {
  const leftOpen = useUIStore((s) => s.leftPanelOpen)
  const rightOpen = useUIStore((s) => s.rightPanelOpen)

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
