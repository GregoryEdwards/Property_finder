import { useMemo, useCallback, useEffect, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { FlyToInterpolator } from '@deck.gl/core'
import { H3HexagonLayer } from '@deck.gl/geo-layers'
import { ScatterplotLayer } from '@deck.gl/layers'
import { Map } from 'react-map-gl/maplibre'
import { useActiveRegionData } from '@/data/useActiveRegionData'
import { CRITERIA } from '@/lib/catalog'
import { scoreCells, indexByH3 } from '@/lib/suitability'
import { suitabilityRGBA } from '@/lib/colorRamp'
import { priceBand } from '@/lib/listings'
import { useProfileStore } from '@/state/useProfileStore'
import { useUIStore } from '@/state/useUIStore'
import { basemapStyle } from './basemaps'
import { Legend } from './Legend'
import { ListingsToggle } from './ListingsToggle'
import { MapLoadingOverlay } from './MapLoadingOverlay'
import type { CellSuitability, Listing } from '@/lib/types'
import type { PickingInfo } from '@deck.gl/core'

interface MinimalViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch?: number
  bearing?: number
  transitionDuration?: number
  transitionInterpolator?: FlyToInterpolator
}

/**
 * The map.
 *
 * Layers (bottom → top):
 *   1. Basemap (MapLibre vector or raster style)
 *   2. H3 suitability hexagons
 *   3. Listings (deck.gl ScatterplotLayer)
 *
 * On region change, we fly the camera to the new region's anchor with a
 * smooth interpolator rather than remounting the map. That preserves
 * the basemap tile cache and avoids a hard flash.
 *
 * View-state is controlled (DeckGL `viewState` prop) so we can drive it
 * programmatically when the user switches region.
 */
export function MapView() {
  const profile = useProfileStore()
  const setSelectedH3 = useUIStore((s) => s.setSelectedH3)
  const setSelectedListingId = useUIStore((s) => s.setSelectedListingId)
  const selectedH3 = useUIStore((s) => s.selectedH3)
  const selectedListingId = useUIStore((s) => s.selectedListingId)
  const heatmapOpacity = useUIStore((s) => s.heatmapOpacity)
  const basemap = useUIStore((s) => s.basemap)
  const showListings = useUIStore((s) => s.showListings)

  const { region, cells, listings, isLoading, hasError, cellCount } =
    useActiveRegionData()

  const [viewState, setViewState] = useState<MinimalViewState>(() => ({
    longitude: region.anchor.lng,
    latitude: region.anchor.lat,
    zoom: region.defaultZoom,
    pitch: 0,
    bearing: 0,
  }))

  // Fly to the new region's anchor whenever the region changes.
  useEffect(() => {
    setViewState({
      longitude: region.anchor.lng,
      latitude: region.anchor.lat,
      zoom: region.defaultZoom,
      pitch: 0,
      bearing: 0,
      transitionDuration: 1400,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.4 }),
    })
  }, [region.id, region.anchor.lat, region.anchor.lng, region.defaultZoom])

  // Compute scored cells. Empty while the region is still loading, which
  // is fine — the WLC over zero cells is a no-op.
  const results: CellSuitability[] = useMemo(
    () => scoreCells(cells, profile, CRITERIA),
    [cells, profile.weights, profile.enabled, profile.constraints],
  )
  const resultsByH3 = useMemo(() => indexByH3(results), [results])

  const layerData = useMemo(
    () =>
      cells.map((c) => ({ h3: c.h3, score: resultsByH3.get(c.h3)?.score ?? null })),
    [cells, resultsByH3],
  )

  const listingData = useMemo(
    () =>
      listings.map((l) => ({
        ...l,
        band: priceBand(l.price),
        cellScore: resultsByH3.get(l.h3)?.score ?? null,
      })),
    [listings, resultsByH3],
  )

  const opacityByte = Math.round(heatmapOpacity * 255)

  const handleClick = useCallback(
    (info: PickingInfo) => {
      if (!info.object) {
        setSelectedH3(null)
        setSelectedListingId(null)
        return
      }
      if (info.layer?.id === 'listings') {
        const l = info.object as Listing
        setSelectedListingId(l.id)
      } else if (info.layer?.id === 'suitability-hex') {
        const o = info.object as { h3: string }
        setSelectedH3(o.h3)
      }
    },
    [setSelectedH3, setSelectedListingId],
  )

  const layers = useMemo(() => {
    const hex = new H3HexagonLayer({
      id: 'suitability-hex',
      data: layerData,
      getHexagon: (d: { h3: string }) => d.h3,
      getFillColor: (d: { score: number | null }) =>
        suitabilityRGBA(d.score, opacityByte),
      getLineColor: (d: { h3: string }) =>
        d.h3 === selectedH3 ? [253, 231, 36, 255] : [0, 0, 0, 0],
      getLineWidth: (d: { h3: string }) => (d.h3 === selectedH3 ? 3 : 0),
      lineWidthUnits: 'pixels',
      stroked: true,
      filled: true,
      extruded: false,
      pickable: true,
      coverage: 1,
      updateTriggers: {
        getFillColor: [layerData, opacityByte],
        getLineColor: [selectedH3],
        getLineWidth: [selectedH3],
      },
    })

    if (!showListings) return [hex]

    const pins = new ScatterplotLayer<(typeof listingData)[number]>({
      id: 'listings',
      data: listingData,
      getPosition: (l) => [l.lng, l.lat],
      getRadius: (l) => 4 + l.band * 1.5,
      radiusUnits: 'pixels',
      getFillColor: (l) =>
        l.cellScore == null
          ? [80, 80, 80, 180]
          : l.id === selectedListingId
            ? [253, 231, 36, 255]
            : [255, 255, 255, 220],
      getLineColor: [11, 15, 23, 255],
      lineWidthUnits: 'pixels',
      getLineWidth: (l) => (l.id === selectedListingId ? 2 : 1),
      stroked: true,
      pickable: true,
      updateTriggers: {
        getFillColor: [selectedListingId, listingData],
        getLineWidth: [selectedListingId],
      },
    })

    return [hex, pins]
  }, [
    layerData,
    opacityByte,
    selectedH3,
    selectedListingId,
    listingData,
    showListings,
  ])

  return (
    <div className="relative h-full w-full">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e) =>
          setViewState(e.viewState as MinimalViewState)
        }
        controller={true}
        layers={layers}
        onClick={handleClick}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
      >
        <Map mapStyle={basemapStyle(basemap)} reuseMaps />
      </DeckGL>
      <Legend />
      <ListingsToggle />
      <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-bg-panel/85 px-2 py-1 text-[10px] uppercase tracking-wider text-ink-muted shadow backdrop-blur">
        {region.displayName} ·{' '}
        {(cellCount || cells.length).toLocaleString()} cells · H3 res 8
      </div>
      {(isLoading || hasError) && (
        <MapLoadingOverlay
          isLoading={isLoading}
          hasError={hasError}
          regionName={region.displayName}
        />
      )}
    </div>
  )
}
