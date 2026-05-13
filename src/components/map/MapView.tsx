import { useMemo, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { H3HexagonLayer } from '@deck.gl/geo-layers'
import { Map } from 'react-map-gl/maplibre'
import { getAustinCells, SEED } from '@/data/loader'
import { CRITERIA } from '@/lib/catalog'
import { scoreCells, indexByH3 } from '@/lib/suitability'
import { suitabilityRGBA } from '@/lib/colorRamp'
import { useProfileStore } from '@/state/useProfileStore'
import { useUIStore } from '@/state/useUIStore'
import { basemapStyle } from './basemaps'
import { Legend } from './Legend'
import type { CellScores, CellSuitability } from '@/lib/types'
import type { PickingInfo } from '@deck.gl/core'

const INITIAL_VIEW_STATE = {
  longitude: SEED.downtownAnchor.lng,
  latitude: SEED.downtownAnchor.lat,
  zoom: 10.5,
  pitch: 0,
  bearing: 0,
}

/**
 * The map.
 *
 * Architecture:
 *   1. Pull the static seed dataset (3k Austin H3 cells).
 *   2. On every profile change, run the WLC client-side. ~3k cells × ~6
 *      criteria runs in <2 ms in plain JS — fast enough that no debouncing
 *      is required.
 *   3. Render the H3HexagonLayer with one fill color per cell from the
 *      Viridis ramp.
 *   4. Click handler sets the selected cell in the UI store; the right
 *      panel reads it to render the explanation card.
 *
 * deck.gl `updateTriggers` is crucial: without it the layer would cache
 * getFillColor outputs and the heatmap wouldn't refresh on weight changes.
 */
export function MapView() {
  const profile = useProfileStore()
  const setSelectedH3 = useUIStore((s) => s.setSelectedH3)
  const selectedH3 = useUIStore((s) => s.selectedH3)
  const heatmapOpacity = useUIStore((s) => s.heatmapOpacity)
  const basemap = useUIStore((s) => s.basemap)

  const cells: CellScores[] = useMemo(() => getAustinCells(), [])

  const results: CellSuitability[] = useMemo(
    () => scoreCells(cells, profile, CRITERIA),
    [cells, profile.weights, profile.enabled, profile.constraints],
  )

  const resultsByH3 = useMemo(() => indexByH3(results), [results])

  // Build a single combined dataset of [cell + score] so the deck.gl layer
  // has everything it needs in one object per row. This avoids extra lookups
  // inside the accessor (which runs once per cell per frame).
  const layerData = useMemo(
    () =>
      cells.map((c) => {
        const r = resultsByH3.get(c.h3)
        return {
          h3: c.h3,
          score: r?.score ?? null,
        }
      }),
    [cells, resultsByH3],
  )

  const opacityByte = Math.round(heatmapOpacity * 255)

  const handleClick = useCallback(
    (info: PickingInfo) => {
      const obj = info.object as { h3: string } | undefined
      setSelectedH3(obj?.h3 ?? null)
    },
    [setSelectedH3],
  )

  const layers = useMemo(
    () => [
      new H3HexagonLayer({
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
        // updateTriggers tells deck.gl when to invalidate cached accessor
        // outputs. Without these, weight-slider changes wouldn't redraw.
        updateTriggers: {
          getFillColor: [layerData, opacityByte],
          getLineColor: [selectedH3],
          getLineWidth: [selectedH3],
        },
      }),
    ],
    [layerData, opacityByte, selectedH3],
  )

  return (
    <div className="relative h-full w-full">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        onClick={handleClick}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
      >
        <Map mapStyle={basemapStyle(basemap)} reuseMaps />
      </DeckGL>
      <Legend />
      <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-bg-panel/85 px-2 py-1 text-[10px] uppercase tracking-wider text-ink-muted shadow backdrop-blur">
        {SEED.cellCount.toLocaleString()} cells · H3 res {SEED.h3Resolution}
      </div>
    </div>
  )
}
