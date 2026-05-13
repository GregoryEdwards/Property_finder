import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  MapPinned,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import type { Listing } from '@/lib/types'
import {
  useListingsFilterStore,
  type SortKey,
} from '@/state/useListingsFilterStore'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'suitability_desc', label: 'Best suitability' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
  { value: 'beds_desc', label: 'Most bedrooms' },
  { value: 'newest', label: 'Newest listed' },
]

const PROPERTY_TYPES: Array<{ value: Listing['propertyType']; label: string }> = [
  { value: 'flat', label: 'Flat' },
  { value: 'terraced', label: 'Terraced' },
  { value: 'semi_detached', label: 'Semi' },
  { value: 'detached', label: 'Detached' },
  { value: 'maisonette', label: 'Maisonette' },
  { value: 'bungalow', label: 'Bungalow' },
]

const TENURES: Array<{ value: Listing['tenure']; label: string }> = [
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'share_of_freehold', label: 'Share of FH' },
]

const EPC_OPTIONS: Listing['epc'][] = ['A', 'B', 'C', 'D']

/**
 * Filter + sort toolbar above the listings list.
 *
 * Always-visible row: postcode search, sort, expand toggle, reset.
 * Expanded row: price range, beds range, EPC, property type, tenure, viewport.
 */
interface Props {
  matchedCount: number
  totalCount: number
}

export function ListingsFilterBar({ matchedCount, totalCount }: Props) {
  const [expanded, setExpanded] = useState(false)
  const f = useListingsFilterStore()

  const activeFilterCount =
    (f.minPrice != null ? 1 : 0) +
    (f.maxPrice != null ? 1 : 0) +
    (f.minBeds != null ? 1 : 0) +
    (f.maxBeds != null ? 1 : 0) +
    (f.minEpc != null ? 1 : 0) +
    f.propertyTypes.size +
    f.tenures.size +
    (f.viewportOnly ? 1 : 0) +
    (f.postcodeQuery.trim() ? 1 : 0)

  return (
    <div className="border-b border-border bg-bg-panel">
      {/* Top row: search + sort + expand */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={f.postcodeQuery}
            onChange={(e) => f.setPostcodeQuery(e.target.value)}
            placeholder="Postcode prefix"
            aria-label="Filter by postcode prefix"
            className="w-full rounded-md border border-border bg-bg-base py-1 pl-7 pr-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={f.sort}
          onChange={(e) => f.setSort(e.target.value as SortKey)}
          aria-label="Sort listings"
          className="rounded-md border border-border bg-bg-base px-1.5 py-1 text-xs text-ink-primary focus:border-accent focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="listings-filter-detail"
          title="Filters"
          className={cn(
            'relative inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            activeFilterCount > 0
              ? 'bg-accent text-bg-base'
              : 'text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-ink-primary px-1 font-mono text-[9px] text-bg-base">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Result count + viewport toggle */}
      <div className="flex items-center justify-between gap-2 px-3 pb-2 text-[10px] uppercase tracking-wider text-ink-muted">
        <span>
          {matchedCount.toLocaleString()} of {totalCount.toLocaleString()} listings
        </span>
        <label className="flex cursor-pointer items-center gap-1 text-ink-secondary hover:text-ink-primary">
          <input
            type="checkbox"
            checked={f.viewportOnly}
            onChange={(e) => f.setViewportOnly(e.target.checked)}
            className="h-3 w-3 rounded border-border bg-bg-base text-accent focus:ring-accent"
          />
          <MapPinned className="h-3 w-3" />
          In view only
        </label>
      </div>

      {expanded && (
        <div
          id="listings-filter-detail"
          className="border-t border-border bg-bg-base px-3 pb-3 pt-2"
        >
          {/* Price */}
          <div className="mb-3">
            <Label>Price (£)</Label>
            <div className="flex items-center gap-2">
              <NumberInput
                value={f.minPrice}
                onChange={(v) => f.setPriceRange(v, f.maxPrice)}
                placeholder="Min"
                step={25_000}
              />
              <span className="text-ink-muted">–</span>
              <NumberInput
                value={f.maxPrice}
                onChange={(v) => f.setPriceRange(f.minPrice, v)}
                placeholder="Max"
                step={25_000}
              />
            </div>
          </div>

          {/* Beds */}
          <div className="mb-3">
            <Label>Bedrooms</Label>
            <div className="flex items-center gap-2">
              <NumberInput
                value={f.minBeds}
                onChange={(v) => f.setBedsRange(v, f.maxBeds)}
                placeholder="Min"
              />
              <span className="text-ink-muted">–</span>
              <NumberInput
                value={f.maxBeds}
                onChange={(v) => f.setBedsRange(f.minBeds, v)}
                placeholder="Max"
              />
            </div>
          </div>

          {/* EPC */}
          <div className="mb-3">
            <Label>Minimum EPC band</Label>
            <div className="flex flex-wrap gap-1">
              <ChipButton
                active={f.minEpc === null}
                onClick={() => f.setMinEpc(null)}
              >
                Any
              </ChipButton>
              {EPC_OPTIONS.map((b) => (
                <ChipButton
                  key={b}
                  active={f.minEpc === b}
                  onClick={() => f.setMinEpc(b)}
                >
                  {b}+
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Property type */}
          <div className="mb-3">
            <Label>Property type</Label>
            <div className="flex flex-wrap gap-1">
              {PROPERTY_TYPES.map((t) => (
                <ChipButton
                  key={t.value}
                  active={f.propertyTypes.has(t.value)}
                  onClick={() => f.togglePropertyType(t.value)}
                >
                  {t.label}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Tenure */}
          <div className="mb-2">
            <Label>Tenure</Label>
            <div className="flex flex-wrap gap-1">
              {TENURES.map((t) => (
                <ChipButton
                  key={t.value}
                  active={f.tenures.has(t.value)}
                  onClick={() => f.toggleTenure(t.value)}
                >
                  {t.label}
                </ChipButton>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => f.reset()}
            className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-ink-secondary hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RotateCcw className="h-3 w-3" />
            Reset filters
          </button>

          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="float-right inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-ink-secondary hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronUp className="h-3 w-3" />
            Collapse
          </button>
        </div>
      )}

      {!expanded && activeFilterCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1 border-t border-border bg-bg-base py-1 text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink-primary"
        >
          <ChevronDown className="h-3 w-3" />
          Show {activeFilterCount} active filters
        </button>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted">
      {children}
    </div>
  )
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
        active
          ? 'border-accent bg-accent/15 text-ink-primary'
          : 'border-border bg-bg-subtle text-ink-secondary hover:border-border-strong',
      )}
    >
      {children}
    </button>
  )
}

function NumberInput({
  value,
  onChange,
  placeholder,
  step = 1,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder: string
  step?: number
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : Number(v))
      }}
      placeholder={placeholder}
      step={step}
      className="w-full rounded-md border border-border bg-bg-panel px-2 py-1 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
    />
  )
}
