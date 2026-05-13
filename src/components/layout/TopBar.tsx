import { BookOpen, Layers, BarChart3, MapPin, Sun, Moon, Satellite, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUIStore } from '@/state/useUIStore'
import { useRegionStore } from '@/state/useRegionStore'
import { REGIONS_BY_ID } from '@/lib/regions'
import { IconButton } from '@/components/ui/IconButton'
import { RegionPicker } from './RegionPicker'
import { useState } from 'react'

/**
 * Top bar — region picker, search stub, basemap controls, panel toggles.
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
  const activeRegionId = useRegionStore((s) => s.activeRegionId)
  const region = REGIONS_BY_ID[activeRegionId]

  return (
    <header className="flex h-12 items-center justify-between gap-3 border-b border-border bg-bg-panel px-3">
      <div className="flex items-center gap-2">
        <IconButton
          ariaLabel={leftPanelOpen ? 'Collapse priorities panel' : 'Expand priorities panel'}
          active={leftPanelOpen}
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          title="Priorities"
        >
          <Layers className="h-4 w-4" />
        </IconButton>
        <div className="ml-2 flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-ink-primary">
            HomeSite
          </span>
          <span className="hidden text-[10px] uppercase tracking-wider text-ink-muted sm:inline">
            Phase 1.1 · UK
          </span>
        </div>
      </div>

      <RegionPicker />

      <SearchStub />

      <div className="flex items-center gap-1">
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
        <span className="hidden text-xs text-ink-secondary lg:inline">
          <MapPin className="-mt-0.5 mr-1 inline h-3 w-3" />
          Anchor: {region?.anchor.name ?? '—'}
        </span>
        <Link
          to="/methodology"
          title="Methodology & sources"
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-ink-secondary hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden xl:inline">Methodology</span>
        </Link>
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

function SearchStub() {
  const [q, setQ] = useState('')
  return (
    <div className="relative hidden flex-1 max-w-md md:block">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search postcode, area, or station (Phase 2)"
        className="w-full rounded-md border border-border bg-bg-base py-1.5 pl-8 pr-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
        aria-label="Search postcode or area"
      />
    </div>
  )
}
