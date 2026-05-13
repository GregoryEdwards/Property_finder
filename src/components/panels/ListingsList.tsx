import { Heart } from 'lucide-react'
import type { CellSuitability, Listing } from '@/lib/types'
import { suitabilityRGBA } from '@/lib/colorRamp'
import { formatGBP, cn } from '@/lib/utils'
import { useFavouritesStore } from '@/state/useFavoritesStore'
import { useUIStore } from '@/state/useUIStore'
import { useFilteredListings } from '@/data/useFilteredListings'
import { ListingsFilterBar } from './ListingsFilterBar'

interface Props {
  listings: Listing[]
  resultsByH3: Map<string, CellSuitability>
  /** Restrict to favourited listings (drives the Favourites tab). */
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
 * Region-scoped listings list with filter / sort / postcode search /
 * viewport-only toggle (all wired through useListingsFilterStore).
 *
 * Each row renders a hero thumbnail (first photo in `listing.photos`),
 * the price, address, beds/type, the per-property suitability score,
 * and a heart for favourites. Clicking opens the PropertyDetail panel.
 */
export function ListingsList({ listings, resultsByH3, onlyFavourites }: Props) {
  const { favouriteListingIds, toggleListing } = useFavouritesStore()
  const setSelectedListingId = useUIStore((s) => s.setSelectedListingId)
  const selectedListingId = useUIStore((s) => s.selectedListingId)
  const favSet = new Set(favouriteListingIds)

  const { rows, totalMatched } = useFilteredListings({
    listings,
    resultsByH3,
    onlyFavourites,
  })

  return (
    <>
      <ListingsFilterBar
        matchedCount={totalMatched}
        totalCount={
          onlyFavourites
            ? listings.filter((l) => favSet.has(l.id)).length
            : listings.length
        }
      />

      {rows.length === 0 ? (
        <div className="px-3 py-6 text-xs text-ink-muted">
          {onlyFavourites
            ? 'No favourites match these filters. Tap the heart on a listing first, or reset the filter set.'
            : 'No listings match these filters. Try widening the price or bed range, or reset to defaults.'}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ listing, result }) => {
            const score = result.score!
            const [r, g, b] = suitabilityRGBA(score, 255)
            const favourited = favSet.has(listing.id)
            const isSelected = listing.id === selectedListingId
            const hero = listing.photos?.[0]
            return (
              <li key={listing.id}>
                <button
                  type="button"
                  onClick={() => setSelectedListingId(listing.id)}
                  className={cn(
                    'flex w-full items-stretch gap-2 px-3 py-2 text-left transition-colors hover:bg-bg-hover focus:bg-bg-hover focus:outline-none',
                    isSelected && 'bg-bg-hover',
                  )}
                >
                  {hero ? (
                    <img
                      src={hero}
                      alt=""
                      loading="lazy"
                      className="h-14 w-20 shrink-0 rounded-sm bg-bg-subtle object-cover"
                    />
                  ) : (
                    <div className="h-14 w-20 shrink-0 rounded-sm bg-bg-subtle" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-sm text-ink-primary">
                        {formatGBP(listing.price, { short: true })}
                      </span>
                      <span className="text-[10px] text-ink-muted">
                        · {listing.beds} bed ·{' '}
                        {PROP_TYPE_SHORT[listing.propertyType]}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-secondary">
                      {listing.addressLine}, {listing.postcode}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-muted">
                      <span>EPC {listing.epc}</span>
                      <span>·</span>
                      <span>{listing.daysOnMarket}d</span>
                    </span>
                  </span>
                  <span className="flex flex-col items-end justify-between gap-1">
                    <span
                      className="flex h-6 w-9 shrink-0 items-center justify-center rounded font-mono text-xs"
                      style={{
                        backgroundColor: `rgb(${r}, ${g}, ${b})`,
                        color: score > 60 ? '#0b0f17' : '#ffffff',
                      }}
                      title={`Suitability ${Math.round(score)} / 100`}
                    >
                      {Math.round(score)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleListing(listing.id)
                      }}
                      aria-pressed={favourited}
                      aria-label={
                        favourited
                          ? 'Remove from favourites'
                          : 'Add to favourites'
                      }
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors',
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
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
