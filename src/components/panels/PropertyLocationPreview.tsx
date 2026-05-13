import { useEffect, useState } from 'react'
import { ExternalLink, Eye, Map as MapIcon, MapPin, Navigation } from 'lucide-react'
import { Map, Marker } from 'react-map-gl/maplibre'
import type { Listing } from '@/lib/types'
import { basemapStyle } from '@/components/map/basemaps'
import { useUIStore } from '@/state/useUIStore'

interface Props {
  listing: Listing
}

/**
 * Inline location preview for a listing.
 *
 * Phase 1.5 originally shipped this as a tabbed Google Maps / OpenStreetMap
 * iframe embed, but the Google `output=embed` legacy pattern is increasingly
 * blocked by `X-Frame-Options: SAMEORIGIN`, producing a blank iframe. When
 * both providers fail (some networks block them entirely) the user sees an
 * empty card and reports a "blank screen."
 *
 * Phase 1.5.1 replaces the iframes with a small MapLibre map driven by the
 * same basemap style the user has selected globally (dark / light /
 * satellite). It uses the same WebGL stack as the main map, so:
 *   - no iframe → no X-Frame-Options concerns
 *   - no third-party loading → reliable in restricted networks
 *   - visual continuity with the main map (same tiles, same look)
 *   - the user can pan + zoom freely without leaving the panel
 *
 * The footer keeps the prominent Street View deep-link (real imagery of the
 * actual street at the listing's coordinates) plus deep-links to Google
 * Maps and OpenStreetMap for full external views.
 */
export function PropertyLocationPreview({ listing }: Props) {
  // Read the user's current basemap so the mini-map matches the main map.
  const basemap = useUIStore((s) => s.basemap)
  const [mapError, setMapError] = useState<string | null>(null)

  // Defensive: lat/lng must be finite numbers. If a malformed listing ever
  // slipped through we want to render a graceful placeholder rather than
  // crash MapLibre.
  const validCoord =
    Number.isFinite(listing.lat) && Number.isFinite(listing.lng)

  // Reset the error state when the listing changes — the parent already
  // keys PropertyDetail on listing.id, but this hook is defensive.
  useEffect(() => {
    setMapError(null)
  }, [listing.id])

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
        <div className="font-mono text-[10px] text-ink-muted">
          {listing.lat.toFixed(4)}, {listing.lng.toFixed(4)}
        </div>
      </header>

      <div className="relative aspect-[16/10] w-full bg-bg-subtle">
        {validCoord && !mapError ? (
          <Map
            initialViewState={{
              longitude: listing.lng,
              latitude: listing.lat,
              zoom: 15.5,
              pitch: 0,
              bearing: 0,
            }}
            mapStyle={basemapStyle(basemap)}
            // Keep the attribution control on; the basemap providers
            // (CartoDB / Esri / OSM) require visible credit. MapLibre's
            // attribution is compact by default at this size.
            attributionControl={true}
            onError={(e) => {
              setMapError(e?.error?.message ?? 'Map failed to load')
            }}
            reuseMaps
            style={{ position: 'absolute', inset: 0 }}
          >
            <Marker
              longitude={listing.lng}
              latitude={listing.lat}
              anchor="bottom"
            >
              {/* Hand-styled pin — matches the accent colour. The
                  drop-shadow lifts it off the basemap. */}
              <div
                className="relative -mb-1 drop-shadow-lg"
                aria-hidden
                title={`${listing.addressLine}, ${listing.postcode}`}
              >
                <MapPin
                  className="h-6 w-6 text-accent"
                  fill="currentColor"
                  strokeWidth={1.5}
                />
              </div>
            </Marker>
          </Map>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center text-xs text-ink-muted">
            <MapIcon className="h-5 w-5" />
            <span>
              {mapError ?? 'Location coordinates unavailable for this listing'}
            </span>
          </div>
        )}
      </div>

      {/* Footer.
          The Street View CTA is the visual cornerstone of the "real-imagery"
          story — it sits next to the inline map so the user's eye groups
          them. The two open-in-tab links below give a Google or OSM full
          view in a new tab. */}
      <div className="flex flex-col gap-1.5 border-t border-border bg-bg-panel px-3 py-2">
        <a
          href={listing.portals.googleStreetView}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-between gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-base hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
          title="Real Google Street View imagery at this property's coordinates"
        >
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            View Street View imagery here
          </span>
          <ExternalLink className="h-3.5 w-3.5 opacity-75 group-hover:opacity-100" />
        </a>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <FooterLink
            href={listing.portals.googleMaps}
            label="Open in Google Maps"
            icon={<Navigation className="h-3 w-3" />}
          />
          <FooterLink
            href={openStreetMapUrl(listing.lat, listing.lng)}
            label="Open in OpenStreetMap"
            icon={<MapIcon className="h-3 w-3" />}
          />
        </div>
      </div>
    </section>
  )
}

function FooterLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-bg-subtle px-2 py-1.5 text-ink-secondary transition-colors hover:border-border-strong hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {icon}
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-ink-muted" />
    </a>
  )
}

function openStreetMapUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
}
