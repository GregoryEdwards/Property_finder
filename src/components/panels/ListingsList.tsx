import { Heart } from 'lucide-react'
import type { CellSuitability, Listing } from '@/lib/types'
import { suitabilityRGBA } from '@/lib/colorRamp'
import { formatGBP, cn } from '@/lib/utils'
import { useFavouritesStore } from '@/state/useFavoritesStore'
import { useUIStore } from '@/state/useUIStore'

interface Props {
  listings: Listing[]
  resultsByH3: Map<string, CellSuitability>
  /** Only show listings whose cell scores above this threshold. */
  topZonesThreshold?: number | null
  /** Restrict to favourites. */
  onlyFavourites?: boolean
}

const PROP_TYPE_SHORT: Record<Listing['propertyType'], string> = {
  flat: 'Flat',
  terraced: 'Terraced',
  semi_detached: 'Semi',
  detached: 'Detached',
  maisonette: 'Maisonette',
  bungalow: 'Bungalow',
}

/**
 * A compact, sortable card list of listings. Filters by score / favourites
 * and sorts by composite suitability (highest first).
 */
export function ListingsList({
  listings,
  resultsByH3,
  topZonesThreshold,
  onlyFavourites,
}: Props) {
  const { favouriteListingIds, toggleListing } = useFavouritesStore()
  const setSelectedListingId = useUIStore((s) => s.setSelectedListingId)
  const selectedListingId = useUIStore((s) => s.selectedListingId)
  const favSet = new Set(favouriteListingIds)

  const rows = listings
    .map((l) => ({ listing: l, result: resultsByH3.get(l.h3) }))
    .filter((r) => {
      if (!r.result || r.result.score === null) return false
      if (topZonesThreshold != null && r.result.score < topZonesThreshold) return false
      if (onlyFavourites && !favSet.has(r.listing.id)) return false
      return true
    })
    .sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0))
    .slice(0, 50)

  if (rows.length === 0) {
    return (
      <div className="px-3 py-6 text-xs text-ink-muted">
        {onlyFavourites
          ? 'No favourites yet. Open a listing on the map and tap the heart.'
          : 'No listings match the active filters.'}
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map(({ listing, result }) => {
        const score = result!.score!
        const [r, g, b] = suitabilityRGBA(score, 255)
        const favourited = favSet.has(listing.id)
        const isSelected = listing.id === selectedListingId
        return (
          <li key={listing.id}>
            <button
              type="button"
              onClick={() => setSelectedListingId(listing.id)}
              className={cn(
                'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-bg-hover focus:bg-bg-hover focus:outline-none',
                isSelected && 'bg-bg-hover',
              )}
            >
              <span
                className="mt-0.5 flex h-7 w-9 shrink-0 items-center justify-center rounded font-mono text-xs"
                style={{
                  backgroundColor: `rgb(${r}, ${g}, ${b})`,
                  color: score > 60 ? '#0b0f17' : '#ffffff',
                }}
              >
                {Math.round(score)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5 text-sm text-ink-primary">
                  {formatGBP(listing.price, { short: true })}
                  <span className="text-[10px] text-ink-muted">
                    · {listing.beds} bed · {PROP_TYPE_SHORT[listing.propertyType]}
                  </span>
                </span>
                <span className="block truncate text-[11px] text-ink-secondary">
                  {listing.addressLine}, {listing.postcode}
                </span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleListing(listing.id)
                }}
                aria-pressed={favourited}
                aria-label={
                  favourited ? 'Remove from favourites' : 'Add to favourites'
                }
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors',
                  favourited
                    ? 'text-accent hover:bg-bg-base'
                    : 'text-ink-muted hover:bg-bg-base hover:text-ink-secondary',
                )}
              >
                <Heart
                  className="h-3.5 w-3.5"
                  fill={favourited ? 'currentColor' : 'none'}
                />
              </button>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
