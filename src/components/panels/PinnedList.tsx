import { Plus, Pin, Trash2 } from 'lucide-react'
import type { CellSuitability } from '@/lib/types'
import { REGIONS_BY_ID } from '@/lib/regions'
import { suitabilityRGBA } from '@/lib/colorRamp'
import { usePinnedStore } from '@/state/usePinnedStore'
import { useUIStore } from '@/state/useUIStore'
import { useRegionStore } from '@/state/useRegionStore'
import { formatGBP, cn } from '@/lib/utils'

interface Props {
  resultsByH3: Map<string, CellSuitability>
  /** Show the "Add pinned property" button at the top. */
  onAdd: () => void
}

/**
 * Ranked list of user-pinned properties.
 *
 * Sorting: by composite suitability in the active region, descending.
 * Pins outside the active region float to the bottom with a region
 * badge so the user can switch region to score them.
 *
 * Clicking a row selects the pin (opens its detail panel + flies the
 * map). Clicking the trash icon removes it.
 */
export function PinnedList({ resultsByH3, onAdd }: Props) {
  const pins = usePinnedStore((s) => s.pins)
  const removePin = usePinnedStore((s) => s.remove)
  const setSelectedPinnedId = useUIStore((s) => s.setSelectedPinnedId)
  const selectedPinnedId = useUIStore((s) => s.selectedPinnedId)
  const activeRegionId = useRegionStore((s) => s.activeRegionId)
  const setActiveRegion = useRegionStore((s) => s.setActiveRegion)

  // Sort: in-region scored desc, then in-region unscored, then other regions.
  const ranked = [...pins].sort((a, b) => {
    const aIn = a.regionId === activeRegionId
    const bIn = b.regionId === activeRegionId
    if (aIn !== bIn) return aIn ? -1 : 1
    if (aIn) {
      const aScore = a.h3 ? (resultsByH3.get(a.h3)?.score ?? -1) : -1
      const bScore = b.h3 ? (resultsByH3.get(b.h3)?.score ?? -1) : -1
      return bScore - aScore
    }
    // Both in other regions — most recent first.
    return b.updatedAt.localeCompare(a.updatedAt)
  })

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-ink-muted">
          {pins.length} pinned {pins.length === 1 ? 'property' : 'properties'}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-bg-base hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus className="h-3 w-3" />
          Add pin
        </button>
      </div>

      {pins.length === 0 ? (
        <EmptyState onAdd={onAdd} />
      ) : (
        <ul className="divide-y divide-border">
          {ranked.map((pin) => {
            const inActive = pin.regionId === activeRegionId
            const result = inActive && pin.h3 ? resultsByH3.get(pin.h3) : null
            const score = result?.score ?? null
            const [r, g, b] = suitabilityRGBA(score, 255)
            const isSelected = pin.id === selectedPinnedId
            const regionName = pin.regionId
              ? REGIONS_BY_ID[pin.regionId]?.displayName
              : null

            return (
              <li key={pin.id}>
                <div
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-bg-hover',
                    isSelected && 'bg-bg-hover',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPinnedId(pin.id)}
                    className="flex flex-1 min-w-0 items-start gap-2 text-left focus:outline-none"
                  >
                    {score !== null ? (
                      <span
                        className="mt-0.5 flex h-7 w-9 shrink-0 items-center justify-center rounded font-mono text-xs"
                        style={{
                          backgroundColor: `rgb(${r}, ${g}, ${b})`,
                          color: score > 60 ? '#0b0f17' : '#ffffff',
                        }}
                        title={`Suitability ${Math.round(score)} / 100`}
                      >
                        {Math.round(score)}
                      </span>
                    ) : (
                      <span
                        className="mt-0.5 flex h-7 w-9 shrink-0 items-center justify-center rounded bg-bg-subtle font-mono text-xs text-ink-muted"
                        title={
                          inActive
                            ? 'Cell missing or masked by hard constraint'
                            : 'Outside the active region'
                        }
                      >
                        —
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <Pin className="h-3 w-3 shrink-0 text-accent" fill="currentColor" />
                        <span className="truncate text-sm text-ink-primary">
                          {pin.name}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-ink-secondary">
                        {[
                          pin.postcode,
                          pin.beds ? `${pin.beds} bed` : null,
                          pin.price ? formatGBP(pin.price, { short: true }) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || (
                          <span className="text-ink-muted">
                            {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                          </span>
                        )}
                      </span>
                      {!inActive && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-ink-muted">
                          In{' '}
                          {regionName ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (pin.regionId) setActiveRegion(pin.regionId)
                              }}
                              className="text-accent hover:underline"
                            >
                              {regionName}
                            </button>
                          ) : (
                            <span>outside supported regions</span>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (
                        window.confirm(
                          `Remove "${pin.name}" from your pinned properties?`,
                        )
                      ) {
                        removePin(pin.id)
                      }
                    }}
                    aria-label={`Remove ${pin.name}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-bg-base hover:text-red-300"
                    title="Remove this pin"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 px-3 py-6 text-xs text-ink-muted">
      <Pin className="h-4 w-4 text-accent" />
      <p>
        Pin properties you've found elsewhere (Rightmove, Zoopla,
        OnTheMarket) and they'll be scored against your current profile.
        Two ways to add a pin: enter its postcode, or click "Add pin" then
        click the map.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-1 inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-bg-base hover:bg-accent/90"
      >
        <Plus className="h-3 w-3" />
        Add your first pin
      </button>
    </div>
  )
}
