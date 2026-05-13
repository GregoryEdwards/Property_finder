import { useMemo } from 'react'
import { Eye, Heart, Home, Loader2 } from 'lucide-react'
import { useActiveRegionData } from '@/data/useActiveRegionData'
import { CRITERIA } from '@/lib/catalog'
import { scoreCells, indexByH3 } from '@/lib/suitability'
import { listingSuitability } from '@/lib/listings'
import { useProfileStore } from '@/state/useProfileStore'
import { useUIStore } from '@/state/useUIStore'
import { useFavouritesStore } from '@/state/useFavoritesStore'
import { ExplanationCard } from './ExplanationCard'
import { PropertyDetail } from './PropertyDetail'
import { ListingsList } from './ListingsList'
import { RankedList } from './RankedList'
import { ErrorBoundary } from '@/components/util/ErrorBoundary'
import { cn } from '@/lib/utils'

/**
 * Right panel — three tabs: Inspect / Listings / Favourites.
 *
 * Pulls cells + listings via the active-region hook, so it automatically
 * refreshes when the user switches metros from the top bar.
 */
export function ResultsPanel() {
  const profile = useProfileStore()
  const selectedH3 = useUIStore((s) => s.selectedH3)
  const selectedListingId = useUIStore((s) => s.selectedListingId)
  const rightTab = useUIStore((s) => s.rightTab)
  const setRightTab = useUIStore((s) => s.setRightTab)
  const favouriteListingIds = useFavouritesStore((s) => s.favouriteListingIds)

  const { cells, listings, isLoading, hasError, region } = useActiveRegionData()

  const results = useMemo(
    () => scoreCells(cells, profile, CRITERIA),
    [cells, profile.weights, profile.enabled, profile.constraints],
  )
  const resultsByH3 = useMemo(() => indexByH3(results), [results])
  const cellByH3 = useMemo(() => new Map(cells.map((c) => [c.h3, c])), [cells])

  const selectedCell = selectedH3 ? cellByH3.get(selectedH3) : undefined
  const selectedCellResult = selectedH3 ? resultsByH3.get(selectedH3) : undefined
  const selectedListing = selectedListingId
    ? listings.find((l) => l.id === selectedListingId)
    : undefined
  const selectedListingCell = selectedListing
    ? cellByH3.get(selectedListing.h3)
    : undefined
  const selectedListingResult = selectedListing
    ? resultsByH3.get(selectedListing.h3)
    : undefined

  return (
    <aside
      className="flex h-full w-96 shrink-0 flex-col border-l border-border bg-bg-panel"
      aria-label="Results"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Results
        </h2>
        <span className="font-mono text-[10px] text-ink-muted">
          {region.displayName}
        </span>
      </div>

      <div role="tablist" className="flex border-b border-border bg-bg-base">
        <TabButton
          active={rightTab === 'inspect'}
          onClick={() => setRightTab('inspect')}
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Inspect"
        />
        <TabButton
          active={rightTab === 'listings'}
          onClick={() => setRightTab('listings')}
          icon={<Home className="h-3.5 w-3.5" />}
          label="Listings"
        />
        <TabButton
          active={rightTab === 'favourites'}
          onClick={() => setRightTab('favourites')}
          icon={<Heart className="h-3.5 w-3.5" />}
          label={`Favourites${favouriteListingIds.length ? ` (${favouriteListingIds.length})` : ''}`}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {hasError && (
          <div className="px-3 py-4 text-xs text-red-300">
            Couldn't load {region.displayName}. The map will populate once the
            data fetches successfully.
          </div>
        )}
        {isLoading && cells.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-ink-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading {region.displayName}…
          </div>
        )}

        {rightTab === 'inspect' && cells.length > 0 && (
          <>
            {selectedListing && selectedListingCell && selectedListingResult ? (
              // Isolate render-time failures so a broken widget inside
              // PropertyDetail (e.g. a third-party iframe blowing up) can
              // never blank the whole right panel. The key resets the
              // boundary on listing switch.
              <ErrorBoundary
                key={selectedListing.id}
                label="property detail"
              >
                <PropertyDetail
                  listing={selectedListing}
                  result={listingSuitability(selectedListing, selectedListingResult)}
                  cellRaw={selectedListingCell.raw}
                />
              </ErrorBoundary>
            ) : selectedCell && selectedCellResult ? (
              <ExplanationCard cell={selectedCell} result={selectedCellResult} />
            ) : (
              <>
                <div className="px-3 py-3 text-xs text-ink-muted">
                  Click a hex on the map for a score breakdown, or click a
                  listing pin for property detail.
                </div>
                <RankedList cells={cells} resultsByH3={resultsByH3} />
              </>
            )}
          </>
        )}

        {rightTab === 'listings' && cells.length > 0 && (
          <ListingsList listings={listings} resultsByH3={resultsByH3} />
        )}

        {rightTab === 'favourites' && cells.length > 0 && (
          <ListingsList
            listings={listings}
            resultsByH3={resultsByH3}
            onlyFavourites
          />
        )}
      </div>
    </aside>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs transition-colors',
        active
          ? 'border-b-2 border-accent bg-bg-panel text-ink-primary'
          : 'text-ink-secondary hover:bg-bg-hover',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}
