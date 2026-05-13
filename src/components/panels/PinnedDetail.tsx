import { useState } from 'react'
import {
  BedDouble,
  Check,
  ExternalLink,
  Eye,
  MapPin,
  Pencil,
  Pin,
  Receipt,
  Trash2,
} from 'lucide-react'
import type { CellSuitability, PinnedProperty } from '@/lib/types'
import { CRITERIA_BY_ID } from '@/lib/catalog'
import { REGIONS_BY_ID } from '@/lib/regions'
import {
  googleMapsUrl,
  googleStreetViewUrl,
  rightmoveSearchUrl,
  rightmoveSoldPricesUrl,
} from '@/lib/propertyUrl'
import { suitabilityRGBA } from '@/lib/colorRamp'
import { usePinnedStore } from '@/state/usePinnedStore'
import { useUIStore } from '@/state/useUIStore'
import { useRegionStore } from '@/state/useRegionStore'
import { formatGBP, cn } from '@/lib/utils'

interface Props {
  pin: PinnedProperty
  result: CellSuitability | null
}

/**
 * Read+edit view of a single user-pinned property.
 *
 * Reuses the scorecard styling from PropertyDetail (so the user sees a
 * consistent "score + top contributors" shape across listings and pins),
 * plus a "Find similar real listings on Rightmove" CTA if we can build
 * a search URL from the pin's price + beds + postcode.
 *
 * Editing: inline via a small Pencil toggle that swaps display text for
 * input fields. No modal — the form is right where the user is looking.
 */
export function PinnedDetail({ pin, result }: Props) {
  const updatePin = usePinnedStore((s) => s.update)
  const removePin = usePinnedStore((s) => s.remove)
  const setSelectedPinnedId = useUIStore((s) => s.setSelectedPinnedId)
  const activeRegionId = useRegionStore((s) => s.activeRegionId)
  const setActiveRegion = useRegionStore((s) => s.setActiveRegion)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: pin.name,
    postcode: pin.postcode ?? '',
    price: pin.price?.toString() ?? '',
    beds: pin.beds?.toString() ?? '',
    externalUrl: pin.externalUrl ?? '',
    notes: pin.notes ?? '',
  })

  const inActive = pin.regionId === activeRegionId
  const score = inActive ? (result?.score ?? null) : null
  const masked = !inActive || score === null
  const [r, g, b] = suitabilityRGBA(score ?? 0, 255)
  const scoreColor = masked ? '#374151' : `rgb(${r}, ${g}, ${b})`
  const regionName = pin.regionId
    ? REGIONS_BY_ID[pin.regionId]?.displayName
    : null

  function saveEdits() {
    updatePin(pin.id, {
      name: draft.name.trim() || pin.name,
      postcode: draft.postcode.trim() || undefined,
      price: draft.price ? Number(draft.price) : undefined,
      beds: draft.beds ? Number(draft.beds) : undefined,
      externalUrl: draft.externalUrl.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    })
    setEditing(false)
  }

  function handleRemove() {
    if (window.confirm(`Remove "${pin.name}" from your pinned properties?`)) {
      removePin(pin.id)
      setSelectedPinnedId(null)
    }
  }

  // Build comparable-listing URLs only when we have the inputs needed.
  const canBuildRightmove =
    !!pin.postcode && !!pin.price && pin.beds !== undefined && pin.beds > 0
  const rightmoveSearch = canBuildRightmove
    ? rightmoveSearchUrl({
        postcode: pin.postcode!,
        price: pin.price!,
        beds: pin.beds!,
      })
    : null
  const soldPrices = pin.postcode
    ? rightmoveSoldPricesUrl({ postcode: pin.postcode })
    : null

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <Pin className="h-3 w-3 text-accent" fill="currentColor" />
            Your pinned property
          </div>
          {editing ? (
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-bg-base px-2 py-1 text-sm text-ink-primary focus:border-accent focus:outline-none"
            />
          ) : (
            <h3 className="mt-1 truncate text-base font-semibold text-ink-primary">
              {pin.name}
            </h3>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <button
              type="button"
              onClick={saveEdits}
              aria-label="Save changes"
              className="flex h-7 w-7 items-center justify-center rounded bg-accent text-bg-base hover:bg-accent/90"
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit pinned property"
              className="flex h-7 w-7 items-center justify-center rounded text-ink-secondary hover:bg-bg-hover hover:text-ink-primary"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove pinned property"
            className="flex h-7 w-7 items-center justify-center rounded text-ink-secondary hover:bg-bg-hover hover:text-red-300"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Location summary */}
      <div className="rounded-md border border-border bg-bg-base px-2.5 py-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-ink-secondary">
          <MapPin className="h-3 w-3 text-accent" />
          {editing ? (
            <input
              type="text"
              value={draft.postcode}
              onChange={(e) =>
                setDraft({ ...draft, postcode: e.target.value.toUpperCase() })
              }
              placeholder="Postcode"
              className="rounded border border-border bg-bg-panel px-1.5 py-0.5 text-[11px] text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          ) : (
            <span className="font-mono">{pin.postcode ?? '—'}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between font-mono text-[10px] text-ink-muted">
          <span>
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </span>
          {!inActive && pin.regionId && regionName && (
            <button
              type="button"
              onClick={() => setActiveRegion(pin.regionId!)}
              className="rounded-sm px-1 text-accent hover:underline"
            >
              In {regionName} — switch
            </button>
          )}
          {!pin.regionId && (
            <span>Outside supported regions</span>
          )}
        </div>
      </div>

      {/* Price + beds */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {editing ? (
          <input
            type="number"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            placeholder="Price (£)"
            step={5000}
            className="rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
        ) : (
          <Stat
            icon={<Receipt className="h-3.5 w-3.5" />}
            label={pin.price ? formatGBP(pin.price) : '—'}
          />
        )}
        {editing ? (
          <input
            type="number"
            value={draft.beds}
            onChange={(e) => setDraft({ ...draft, beds: e.target.value })}
            placeholder="Bedrooms"
            min={0}
            max={20}
            className="rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
        ) : (
          <Stat
            icon={<BedDouble className="h-3.5 w-3.5" />}
            label={pin.beds ? `${pin.beds} bed` : '—'}
          />
        )}
      </div>

      {/* External URL */}
      {editing ? (
        <input
          type="url"
          value={draft.externalUrl}
          onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })}
          placeholder="https://www.rightmove.co.uk/properties/…"
          className="w-full rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      ) : pin.externalUrl ? (
        <a
          href={pin.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 truncate rounded-md border border-border bg-bg-subtle px-2 py-1.5 text-[11px] text-ink-primary hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ExternalLink className="h-3 w-3 shrink-0 text-accent" />
          <span className="truncate">View original listing</span>
        </a>
      ) : null}

      {/* Notes */}
      {editing ? (
        <textarea
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Notes…"
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      ) : pin.notes ? (
        <div className="whitespace-pre-wrap rounded-md border border-border bg-bg-base px-2.5 py-2 text-xs text-ink-secondary">
          {pin.notes}
        </div>
      ) : null}

      {/* Street View (always — coordinates are real) */}
      <a
        href={googleStreetViewUrl({ lat: pin.lat, lng: pin.lng })}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-md border border-border bg-bg-subtle px-3 py-2 transition-colors hover:border-accent hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="Open Google Street View at this pin's coordinates"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-bg-base text-accent group-hover:bg-accent group-hover:text-bg-base">
          <Eye className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm text-ink-primary">
            View on Google Street View
            <ExternalLink className="h-3 w-3 text-ink-muted" />
          </div>
          <div className="truncate text-[11px] text-ink-muted">
            Real imagery at {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
          </div>
        </div>
      </a>

      {/* Comparable real listings */}
      {(rightmoveSearch || soldPrices) && (
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          {rightmoveSearch && (
            <a
              href={rightmoveSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-bg-subtle px-2 py-1.5 text-ink-secondary transition-colors hover:border-border-strong hover:bg-bg-hover hover:text-ink-primary"
            >
              <span className="truncate">Comparable on Rightmove</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-ink-muted" />
            </a>
          )}
          {soldPrices && (
            <a
              href={soldPrices}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-bg-subtle px-2 py-1.5 text-ink-secondary transition-colors hover:border-border-strong hover:bg-bg-hover hover:text-ink-primary"
            >
              <span className="truncate">Sold prices nearby</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-ink-muted" />
            </a>
          )}
          <a
            href={googleMapsUrl({ lat: pin.lat, lng: pin.lng })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-bg-subtle px-2 py-1.5 text-ink-secondary transition-colors hover:border-border-strong hover:bg-bg-hover hover:text-ink-primary"
          >
            <span className="truncate">Open in Google Maps</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-ink-muted" />
          </a>
        </div>
      )}

      {/* Suitability scorecard */}
      <div className="mt-1 rounded-md border border-border bg-bg-base p-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded font-mono text-base font-semibold"
            style={{
              backgroundColor: scoreColor,
              color: masked || (score ?? 0) > 60 ? '#0b0f17' : '#ffffff',
            }}
          >
            {masked ? '—' : Math.round(score!)}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">
              {!inActive
                ? 'Out of region'
                : score === null
                  ? 'Cell excluded'
                  : 'Suitability score'}
            </div>
            <div className="truncate text-xs text-ink-secondary">
              {!inActive
                ? `This pin sits in ${regionName ?? 'an unsupported area'}.`
                : score === null
                  ? 'The cell violates an active hard constraint.'
                  : 'Out of 100 against your current profile'}
            </div>
          </div>
        </div>

        {!masked && result && result.contributions.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">
              Top contributors
            </div>
            {result.contributions.slice(0, 5).map((c) => (
              <div
                key={c.criterionId}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate text-ink-secondary">
                  {c.displayName}
                </span>
                <span
                  className="w-8 shrink-0 text-right font-mono"
                  style={{
                    color:
                      c.score >= 70
                        ? '#22d3ee'
                        : c.score >= 35
                          ? '#9ca3af'
                          : '#ef8023',
                  }}
                  title={CRITERIA_BY_ID[c.criterionId]?.unit}
                >
                  {Math.round(c.score)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1 rounded-md bg-bg-subtle py-1.5 text-ink-primary',
      )}
    >
      <span className="text-ink-secondary">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
