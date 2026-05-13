import { useState } from 'react'
import { ExternalLink, Eye, Map as MapIcon, MapPin } from 'lucide-react'
import type { Listing } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  listing: Listing
}

type Provider = 'google' | 'osm'

/**
 * Embedded location preview for a property listing.
 *
 * Why an iframe embed at all:
 * - The user's pain point was "the inspect tab makes it hard to source the
 *   listing." Inline real-imagery is the most direct answer — they can see
 *   the actual neighbourhood without leaving the panel.
 *
 * Why two providers (Google + OSM) rather than one:
 * - Google Maps embed is more familiar to UK users and routes/POI labels
 *   match what they'd see if they opened Google in a new tab.
 * - OpenStreetMap embed has zero third-party tracking and is a sensible
 *   default for privacy-conscious users.
 * - Both work *without an API key* — Google via its long-standing
 *   `output=embed` legacy pattern; OSM via its officially-supported
 *   `export/embed.html` endpoint.
 *
 * Why no embedded Street View:
 * - Google Maps Embed API for Street View requires an API key (which we
 *   can't ship in a static frontend without leaking it). The deep-link
 *   below the preview opens the real Street View in a new tab — that's
 *   the closest the user gets to "a photo of this place" without a
 *   portal partnership.
 *
 * Lazy-load: iframe `src` is only set once the component mounts (the
 * component is itself only rendered when PropertyDetail is on screen),
 * but we also pass `loading="lazy"` so the browser can defer if the
 * iframe is offscreen at first.
 */
export function PropertyLocationPreview({ listing }: Props) {
  const [provider, setProvider] = useState<Provider>('google')

  return (
    <section
      aria-label="Property location preview"
      className="overflow-hidden rounded-md border border-border bg-bg-base"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
          <MapPin className="h-3 w-3" />
          Location preview
        </div>
        <div role="tablist" className="flex overflow-hidden rounded border border-border bg-bg-subtle">
          <TabBtn
            label="Google"
            active={provider === 'google'}
            onClick={() => setProvider('google')}
          />
          <TabBtn
            label="OpenStreetMap"
            active={provider === 'osm'}
            onClick={() => setProvider('osm')}
          />
        </div>
      </header>

      <div className="relative aspect-[16/10] w-full bg-bg-subtle">
        {provider === 'google' ? (
          <iframe
            key={`g-${listing.id}`}
            title={`Google Map of ${listing.addressLine}`}
            src={googleMapsEmbedSrc(listing.lat, listing.lng)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <iframe
            key={`o-${listing.id}`}
            title={`OpenStreetMap of ${listing.addressLine}`}
            src={osmEmbedSrc(listing.lat, listing.lng)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>

      {/* Footer: prominent Street View link (real imagery) + open-in-tab
          links. We surface the Street View call-to-action here, *next to
          the map preview*, because that's where users instinctively look
          for "show me what this street actually looks like." */}
      <div className="flex flex-col gap-1.5 border-t border-border bg-bg-panel px-3 py-2">
        <a
          href={listing.portals.googleStreetView}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-between gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-base hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
          title="Real Street View imagery at this property's coordinates"
        >
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            View Street View imagery here
          </span>
          <ExternalLink className="h-3.5 w-3.5 opacity-75 group-hover:opacity-100" />
        </a>
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
          <span className="truncate">
            <MapIcon className="-mt-0.5 mr-1 inline h-3 w-3" />
            {listing.lat.toFixed(4)}, {listing.lng.toFixed(4)}
          </span>
          <a
            href={
              provider === 'google'
                ? listing.portals.googleMaps
                : openStreetMapUrl(listing.lat, listing.lng)
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-ink-secondary hover:text-ink-primary"
            title="Open the map preview in a new tab for full controls"
          >
            Open in new tab
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  )
}

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors',
        active
          ? 'bg-accent text-bg-base'
          : 'text-ink-secondary hover:text-ink-primary',
      )}
    >
      {label}
    </button>
  )
}

/**
 * Google Maps "legacy" embed URL — `output=embed` works without an API key.
 * It's the pattern Google has supported since the original Maps API and
 * is still the standard "free iframe embed" used across the web.
 */
function googleMapsEmbedSrc(lat: number, lng: number): string {
  const params = new URLSearchParams({
    q: `${lat},${lng}`,
    hl: 'en',
    z: '17',
    output: 'embed',
  })
  return `https://maps.google.com/maps?${params.toString()}`
}

/**
 * OpenStreetMap official embed endpoint. The marker pin uses the
 * documented `marker` query parameter; `bbox` controls the visible area.
 */
function osmEmbedSrc(lat: number, lng: number): string {
  // ±0.0035° gives roughly a 600 m × 400 m frame at UK latitudes.
  const dx = 0.0035
  const dy = 0.0025
  const bbox = `${lng - dx},${lat - dy},${lng + dx},${lat + dy}`
  const params = new URLSearchParams({
    bbox,
    layer: 'mapnik',
    marker: `${lat},${lng}`,
  })
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`
}

/** Standalone OSM link (the embed iframe doesn't surface "Open in a tab"). */
function openStreetMapUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
}
