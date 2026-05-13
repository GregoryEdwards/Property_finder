import { useState } from 'react'
import {
  Bath,
  BedDouble,
  Building2,
  Calendar,
  ExternalLink,
  Eye,
  Heart,
  Info,
  MapPin,
  Maximize2,
  Navigation,
  Receipt,
  Tag,
} from 'lucide-react'
import {
  Legend as RcLegend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import type { Listing, PropertySuitability } from '@/lib/types'
import { CRITERIA_BY_ID } from '@/lib/catalog'
import { cn, epcColor, formatGBP } from '@/lib/utils'
import { suitabilityRGBA } from '@/lib/colorRamp'
import { useFavouritesStore } from '@/state/useFavoritesStore'

interface Props {
  listing: Listing
  result: PropertySuitability
  /** Cell raw values, used to label radar points with raw units. */
  cellRaw: Record<string, number | string>
}

const PROP_TYPE_LABEL: Record<Listing['propertyType'], string> = {
  flat: 'Flat',
  terraced: 'Terraced',
  semi_detached: 'Semi-detached',
  detached: 'Detached',
  maisonette: 'Maisonette',
  bungalow: 'Bungalow',
}

const TENURE_LABEL: Record<Listing['tenure'], string> = {
  freehold: 'Freehold',
  leasehold: 'Leasehold',
  share_of_freehold: 'Share of freehold',
}

export function PropertyDetail({ listing, result, cellRaw }: Props) {
  const { favouriteListingIds, toggleListing } = useFavouritesStore()
  const favourited = favouriteListingIds.includes(listing.id)
  const score = result.score
  const masked = score === null

  const [r, g, b] = suitabilityRGBA(score ?? 0, 255)
  const scoreColor = masked ? '#374151' : `rgb(${r}, ${g}, ${b})`

  // Photo gallery: which thumbnail is currently the hero. Reset to 0 when
  // the user switches listings — we key the component on listing.id in
  // ResultsPanel so a fresh listing remounts and resets this.
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const photos = listing.photos?.length
    ? listing.photos
    : [
        // Backward-compat fallback — pre-Phase-1.3 seeds wouldn't have photos.
        `https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=72`,
      ]
  const hero = photos[Math.min(activePhotoIdx, photos.length - 1)]

  // Radar data — top 6 contributions by absolute share. Recharts wants a
  // flat array of objects with the criterion display name + the score.
  const radarData = result.contributions.slice(0, 8).map((c) => ({
    criterion: shortLabel(c.displayName),
    score: Math.round(c.score),
    fullMark: 100,
  }))

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {/* Hero photo */}
      <div className="relative">
        <div
          className="aspect-[16/9] w-full overflow-hidden rounded-md bg-bg-subtle"
          aria-label="Example property photo"
        >
          <img
            src={hero}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        {/* Honesty caption: these are example photos, not photos of this
            specific property. The portals row below links to the real
            listing pages where genuine photos live. */}
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-bg-base/90 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-secondary backdrop-blur">
          <Info className="h-2.5 w-2.5" />
          Example photo
        </div>
      </div>

      {/* Gallery thumbnails (if more than one photo) */}
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5">
          {photos.slice(0, 4).map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActivePhotoIdx(i)}
              aria-label={`View photo ${i + 1} of ${photos.length}`}
              aria-pressed={i === activePhotoIdx}
              className={cn(
                'aspect-[16/9] overflow-hidden rounded border transition-all',
                i === activePhotoIdx
                  ? 'border-accent opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Header line */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-semibold text-ink-primary">
            {formatGBP(listing.price)}
          </div>
          <div className="truncate text-xs text-ink-secondary">
            {listing.addressLine}, {listing.postcode}
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggleListing(listing.id)}
          aria-pressed={favourited}
          aria-label={favourited ? 'Remove from favourites' : 'Add to favourites'}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
            favourited
              ? 'bg-accent text-bg-base'
              : 'bg-bg-subtle text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
          )}
          title={favourited ? 'Saved' : 'Save'}
        >
          <Heart
            className="h-4 w-4"
            fill={favourited ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      {/* Beds / baths / area row */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat icon={<BedDouble className="h-3.5 w-3.5" />} label={`${listing.beds} bed`} />
        <Stat icon={<Bath className="h-3.5 w-3.5" />} label={`${listing.baths} bath`} />
        <Stat icon={<Maximize2 className="h-3.5 w-3.5" />} label={`${listing.sqft} sqft`} />
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <Tag2 icon={<Tag className="h-3 w-3" />}>
          {PROP_TYPE_LABEL[listing.propertyType]}
        </Tag2>
        <Tag2>{TENURE_LABEL[listing.tenure]}</Tag2>
        <EPCBadge band={listing.epc} />
        <Tag2 icon={<Receipt className="h-3 w-3" />}>
          Council Tax {listing.councilTaxBand}
        </Tag2>
        <Tag2 icon={<Calendar className="h-3 w-3" />}>
          {listing.daysOnMarket}d on market
        </Tag2>
      </div>

      {/* Agent line */}
      {listing.agentName && (
        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <Building2 className="h-3 w-3" />
          Marketed by{' '}
          <span className="text-ink-secondary">{listing.agentName}</span>
        </div>
      )}

      {/* Portal CTAs.
          Each link lands on a *real* page: real Rightmove for-sale search,
          real sold-price comparables, real Zoopla / OnTheMarket listings,
          real Google Street View at the actual coordinates.
          The synthetic listing surfaces real-world context — it doesn't
          pretend to be a real listing itself. */}
      {listing.portals && (
        <PortalCtas portals={listing.portals} listing={listing} />
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
              {masked ? 'Cell excluded' : 'Suitability score'}
            </div>
            <div className="truncate text-xs text-ink-secondary">
              {masked
                ? 'This cell violates a hard constraint.'
                : `Out of 100 against your current profile`}
            </div>
            <div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-ink-muted">
              <MapPin className="h-3 w-3" /> {listing.lat.toFixed(4)},{' '}
              {listing.lng.toFixed(4)}
            </div>
          </div>
        </div>

        {!masked && radarData.length >= 3 && (
          <div className="mt-3 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="78%">
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis
                  dataKey="criterion"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#22d3ee"
                  fill="#22d3ee"
                  fillOpacity={0.35}
                  isAnimationActive={false}
                />
                <RcLegend
                  wrapperStyle={{ color: '#9ca3af', fontSize: 10 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {!masked && (
          <div className="mt-2 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">
              Top contributors
            </div>
            {result.contributions.slice(0, 4).map((c) => {
              const def = CRITERIA_BY_ID[c.criterionId]
              const raw = cellRaw[c.criterionId]
              return (
                <div
                  key={c.criterionId}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-ink-secondary">
                    {c.displayName}
                  </span>
                  <span className="font-mono text-ink-muted">
                    {def && raw !== undefined
                      ? formatRawTrimmed(raw, def.unit)
                      : '—'}
                  </span>
                  <span
                    className="w-8 shrink-0 text-right font-mono"
                    style={{
                      color: c.score >= 70 ? '#22d3ee' : c.score >= 35 ? '#9ca3af' : '#ef8023',
                    }}
                  >
                    {Math.round(c.score)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Portal CTA row. Primary call-to-action is "View on Rightmove" (the largest
 * portal); below it sit a Street View card + a compact grid of secondary
 * portal links. Phase 2 will hoist one of these to point at the specific
 * real listing once portal partnerships exist.
 */
function PortalCtas({
  portals,
  listing,
}: {
  portals: Listing['portals']
  listing: Listing
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Primary — for-sale comparables on Rightmove */}
      <a
        href={portals.rightmoveSearch}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-base hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
        title={`Real Rightmove search: ${listing.beds}-bed in ${listing.postcode.split(' ')[0]} at ~${formatGBP(listing.price, { short: true })}`}
      >
        View comparable on Rightmove
        <ExternalLink className="h-3.5 w-3.5" />
      </a>

      {/* Secondary — Street View card. Visually emphasised because it's the
          closest the user gets to a "real photo of this place" — actual
          imagery of the actual street at the listing's coordinates. */}
      <a
        href={portals.googleStreetView}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-md border border-border bg-bg-subtle px-3 py-2 transition-colors hover:border-accent hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="Open Google Street View at this property's coordinates — real imagery of the actual street"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-bg-base text-accent group-hover:bg-accent group-hover:text-bg-base">
          <Eye className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm text-ink-primary">
            Open Street View
            <ExternalLink className="h-3 w-3 text-ink-muted" />
          </div>
          <div className="truncate text-[11px] text-ink-muted">
            Real imagery at {listing.lat.toFixed(4)}, {listing.lng.toFixed(4)}
          </div>
        </div>
      </a>

      {/* Tertiary — secondary portals (sold prices + other portals + maps) */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <PortalChip
          href={portals.rightmoveSoldPrices}
          label="Rightmove sold prices"
          title="Sold prices in this postcode district — real comparables"
        />
        <PortalChip
          href={portals.zooplaSearch}
          label="Zoopla"
          title="Zoopla for-sale search for this postcode + price band"
        />
        <PortalChip
          href={portals.onTheMarket}
          label="OnTheMarket"
          title="OnTheMarket for-sale search for this postcode district"
        />
        <PortalChip
          href={portals.googleMaps}
          label="Open in Google Maps"
          title="Open the actual coordinates in Google Maps"
          icon={<Navigation className="h-3 w-3" />}
        />
      </div>

      <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-muted">
        <Info className="h-2.5 w-2.5 shrink-0" />
        Listings in Phase 1 are synthetic; the portal links land on real
        comparable properties and Street View shows the actual street.
      </p>
    </div>
  )
}

function PortalChip({
  href,
  label,
  title,
  icon,
}: {
  href: string
  label: string
  title?: string
  icon?: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-bg-subtle px-2 py-1.5 text-ink-secondary transition-colors hover:border-border-strong hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {icon}
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-ink-muted" />
    </a>
  )
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-md bg-bg-subtle py-1.5 text-ink-primary">
      <span className="text-ink-secondary">{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function Tag2({
  children,
  icon,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-subtle px-1.5 py-0.5 text-ink-secondary">
      {icon}
      {children}
    </span>
  )
}

function EPCBadge({ band }: { band: Listing['epc'] }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-bg-base"
      style={{ backgroundColor: epcColor(band) }}
      title={`EPC ${band}`}
    >
      EPC {band}
    </span>
  )
}

/** Shorten long criterion display names for the radar axis labels. */
function shortLabel(name: string): string {
  const map: Record<string, string> = {
    'Median property price': 'Price',
    'Commute to anchor': 'Commute',
    'A&E drive time': 'A&E',
    'Primary school rating': 'Primary',
    'Secondary school rating': 'Secondary',
    'GP surgery (walk)': 'GP',
    'Green space access': 'Green',
    'Broadband (max available)': 'Broadband',
    'Transit accessibility (PTAL)': 'PTAL',
    'Air quality (NO₂)': 'Air',
    'Road noise (Lden)': 'Noise',
    'Crime rate': 'Crime',
    'Flood risk': 'Flood',
    'Council tax band': 'Tax',
    'Fire & rescue response': 'Fire',
  }
  return map[name] ?? name
}

/** Local formatter that prefers compact output for radar/scorecard rows. */
function formatRawTrimmed(value: number | string, unit: string): string {
  if (typeof value === 'string') {
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  if (unit === 'GBP') return formatGBP(value, { short: true })
  if (unit === 'minutes' || unit === 'minutes (walk)') return `${value.toFixed(0)}m`
  if (unit === 'Mbps') return `${Math.round(value)}`
  if (unit === 'PTAL 0-6b') return value.toFixed(1)
  if (unit === 'µg/m³ annual mean') return `${value.toFixed(0)} µg`
  if (unit === 'dB Lden') return `${value.toFixed(0)} dB`
  if (unit === 'crimes per 1k residents / yr') return `${value.toFixed(0)}/1k`
  return value.toFixed(0)
}
