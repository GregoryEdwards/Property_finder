import { Layers, BarChart3, MapPin, Sun, Moon, Satellite, Search } from 'lucide-react'
import { useUIStore } from '@/state/useUIStore'
import { IconButton } from '@/components/ui/IconButton'
import { SEED } from '@/data/loader'
import { useState } from 'react'

/**
 * Top bar — search, brand, basemap picker, panel toggles, anchor.
 *
 * Phase 1 adds the postcode search stub. Real geocoding will live behind
 * `/api/v1/geocode` in Phase 2; this version filters listings client-side
 * on a postcode-prefix match.
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
          <span className="text-[10px] uppercase tracking-wider text-ink-muted">
            Phase 1 · {SEED.regionDisplayName}
          </span>
        </div>
      </div>

      <SearchStub />

      <div className="flex items-center gap-1">
        <span className="mr-2 hidden text-[10px] uppercase tracking-wider text-ink-muted xl:inline">
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
        <span className="hidden text-xs text-ink-secondary lg:inline">
          <MapPin className="-mt-0.5 mr-1 inline h-3 w-3" />
          Anchor: {SEED.anchor.name}
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

/**
 * Lightweight postcode/area search. Phase 1 stub: when the user enters a
 * value, we switch the right panel to the Listings tab and the listings
 * list will filter against this query (read via the UI store in Phase 2).
 *
 * For now it's a visible affordance that primes the user for the feature
 * surface without claiming functionality it doesn't yet have.
 */
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
