import { Layers, BarChart3, MapPin, Sun, Moon, Satellite } from 'lucide-react'
import { useUIStore } from '@/state/useUIStore'
import { IconButton } from '@/components/ui/IconButton'

/**
 * Top bar — app brand, basemap picker, panel toggles, anchor count.
 * Kept slim; most controls live in the side panels.
 */
export function TopBar() {
  const {
    basemap,
    setBasemap,
    leftPanelOpen,
    rightPanelOpen,
    setLeftPanelOpen,
    setRightPanelOpen,
  } = useUIStore()

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-bg-panel px-3">
      <div className="flex items-center gap-2">
        <IconButton
          ariaLabel={leftPanelOpen ? 'Collapse layers panel' : 'Expand layers panel'}
          active={leftPanelOpen}
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          title="Layers & priorities"
        >
          <Layers className="h-4 w-4" />
        </IconButton>
        <div className="ml-2 flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-ink-primary">
            HomeSite
          </span>
          <span className="text-[10px] uppercase tracking-wider text-ink-muted">
            Phase 0 · Austin
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-2 text-[10px] uppercase tracking-wider text-ink-muted">
          Basemap
        </span>
        <IconButton
          ariaLabel="Dark basemap"
          active={basemap === 'dark'}
          onClick={() => setBasemap('dark')}
          title="Dark"
        >
          <Moon className="h-4 w-4" />
        </IconButton>
        <IconButton
          ariaLabel="Light basemap"
          active={basemap === 'light'}
          onClick={() => setBasemap('light')}
          title="Light"
        >
          <Sun className="h-4 w-4" />
        </IconButton>
        <IconButton
          ariaLabel="Satellite basemap"
          active={basemap === 'satellite'}
          onClick={() => setBasemap('satellite')}
          title="Satellite"
        >
          <Satellite className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-ink-secondary sm:inline">
          <MapPin className="-mt-0.5 mr-1 inline h-3 w-3" />
          Anchor: Downtown Austin
        </span>
        <IconButton
          ariaLabel={rightPanelOpen ? 'Collapse results panel' : 'Expand results panel'}
          active={rightPanelOpen}
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          title="Results"
        >
          <BarChart3 className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  )
}
