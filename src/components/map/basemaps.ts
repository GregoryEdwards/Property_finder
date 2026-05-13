/**
 * Basemap style URLs. We default to free, attribution-only sources so the
 * Phase 0 demo doesn't require an API key.
 *
 *  - dark / light: CartoDB vector basemaps (MapLibre-compatible).
 *  - satellite: a minimal raster style pointing at ESRI World Imagery.
 *    (Acceptable for a non-commercial dev demo; swap for a paid provider
 *    before any real deployment.)
 */
import type { BasemapId } from '@/state/useUIStore'
import type { StyleSpecification } from 'maplibre-gl'

const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const CARTO_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution:
        'Imagery © Esri & contributors (World Imagery)',
    },
  },
  layers: [
    {
      id: 'esri-imagery',
      type: 'raster',
      source: 'esri',
    },
  ],
}

export function basemapStyle(id: BasemapId): string | StyleSpecification {
  switch (id) {
    case 'dark':
      return CARTO_DARK
    case 'light':
      return CARTO_LIGHT
    case 'satellite':
      return SATELLITE_STYLE
  }
}
