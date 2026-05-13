/**
 * UK criterion catalog — Phase 1.
 *
 * Fifteen criteria across six categories, sized for a London-first launch
 * but applicable to any UK metro. Each criterion's `dataSource` field names
 * the real upstream we plan to ingest in the pipeline; the Phase-1 seed
 * generator produces synthetic values that look plausible against those
 * sources (e.g. Ofsted's 4-tier ratings, EA's 4-band flood map, council tax
 * bands A-H, NO2 µg/m³).
 *
 * Units are explicitly UK:
 *   - prices in £ GBP
 *   - distances in miles where user-facing; the standardization functions
 *     receive metric where the source is metric (NO2 µg/m³, dB)
 *   - school ratings on the Ofsted 4-tier scale
 */
import type { CriterionDefinition, Preset } from './types'

export const CRITERIA: CriterionDefinition[] = [
  // ───── Safety & Hazard ─────────────────────────────────────────────────
  {
    id: 'flood_risk',
    displayName: 'Flood risk',
    category: 'safety',
    unit: 'EA band',
    direction: 'category',
    defaultWeight: 7,
    defaultEnabled: true,
    description:
      'Environment Agency / NRW / SEPA flood-risk banding for rivers, sea, and surface water.',
    dataSource: 'Environment Agency Flood Map for Planning (synthetic for Phase 1 demo)',
    transform: {
      type: 'categorical',
      mapping: {
        VERY_LOW: 100,
        LOW: 75,
        MEDIUM: 35,
        HIGH: 0,
      },
    },
    defaultHardConstraint: { excludeValues: ['HIGH'] },
  },
  {
    id: 'crime_rate',
    displayName: 'Crime rate',
    category: 'safety',
    unit: 'crimes per 1k residents / yr',
    direction: 'less_is_better',
    defaultWeight: 7,
    defaultEnabled: true,
    description:
      'All recorded crime over the trailing 12 months, normalised per 1,000 residents.',
    dataSource: 'data.police.uk (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 30, acceptableMax: 200, curve: 'linear' },
  },
  {
    id: 'ae_drive_time',
    displayName: 'A&E drive time',
    category: 'safety',
    unit: 'minutes',
    direction: 'less_is_better',
    defaultWeight: 5,
    defaultEnabled: true,
    description:
      'Drive time at 08:30 weekday from the cell centroid to the nearest NHS A&E department.',
    dataSource: 'NHS England estate + OSM routing (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 8, acceptableMax: 30, curve: 'linear' },
  },
  {
    id: 'fire_response',
    displayName: 'Fire & rescue response',
    category: 'safety',
    unit: 'minutes',
    direction: 'less_is_better',
    defaultWeight: 3,
    defaultEnabled: false,
    description:
      'Indicative LFB / FRS response time to a primary fire from the nearest station.',
    dataSource: 'Home Office FRS statistics (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 6, acceptableMax: 15, curve: 'linear' },
  },

  // ───── Facilities & Amenities ──────────────────────────────────────────
  {
    id: 'primary_school',
    displayName: 'Primary school rating',
    category: 'facilities',
    unit: 'Ofsted grade',
    direction: 'category',
    defaultWeight: 7,
    defaultEnabled: true,
    description:
      'Most recent Ofsted overall effectiveness rating for the catchment primary school.',
    dataSource: 'Ofsted ratings dataset (synthetic for Phase 1 demo)',
    transform: {
      type: 'categorical',
      mapping: {
        OUTSTANDING: 100,
        GOOD: 75,
        REQUIRES_IMPROVEMENT: 35,
        INADEQUATE: 0,
      },
    },
  },
  {
    id: 'secondary_school',
    displayName: 'Secondary school rating',
    category: 'facilities',
    unit: 'Ofsted grade',
    direction: 'category',
    defaultWeight: 7,
    defaultEnabled: true,
    description:
      'Most recent Ofsted overall effectiveness rating for the catchment secondary school.',
    dataSource: 'Ofsted ratings dataset (synthetic for Phase 1 demo)',
    transform: {
      type: 'categorical',
      mapping: {
        OUTSTANDING: 100,
        GOOD: 75,
        REQUIRES_IMPROVEMENT: 35,
        INADEQUATE: 0,
      },
    },
  },
  {
    id: 'gp_walk_time',
    displayName: 'GP surgery (walk)',
    category: 'facilities',
    unit: 'minutes',
    direction: 'less_is_better',
    defaultWeight: 4,
    defaultEnabled: true,
    description: 'Walking time to the nearest NHS GP practice accepting new patients.',
    dataSource: 'NHS Digital GP register (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 5, acceptableMax: 20, curve: 'linear' },
  },
  {
    id: 'green_space',
    displayName: 'Green space access',
    category: 'facilities',
    unit: 'minutes (walk)',
    direction: 'less_is_better',
    defaultWeight: 5,
    defaultEnabled: true,
    description:
      'Walking time to the nearest accessible park or green space ≥ 2 ha.',
    dataSource: 'OS Greenspace + GLA (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 5, acceptableMax: 20, curve: 'linear' },
  },

  // ───── Real Estate ─────────────────────────────────────────────────────
  {
    id: 'median_price',
    displayName: 'Median property price',
    category: 'real_estate',
    unit: 'GBP',
    direction: 'less_is_better',
    defaultWeight: 6,
    defaultEnabled: true,
    description:
      'Median residential sale price over the trailing 12 months in this cell.',
    dataSource: 'HM Land Registry Price Paid Data (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 350_000, acceptableMax: 1_500_000, curve: 'linear' },
  },
  {
    id: 'commute_time',
    displayName: 'Commute to anchor',
    category: 'real_estate',
    unit: 'minutes',
    direction: 'less_is_better',
    defaultWeight: 6,
    defaultEnabled: true,
    description:
      'Door-to-door public-transport time at 08:30 to your primary anchor (default: Charing Cross).',
    dataSource: 'TfL Open Data + national rail timetables (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 20, acceptableMax: 60, curve: 'linear' },
  },
  {
    id: 'council_tax',
    displayName: 'Council tax band',
    category: 'real_estate',
    unit: 'VOA band',
    direction: 'category',
    defaultWeight: 3,
    defaultEnabled: false,
    description:
      'Modal council tax band for residential properties in this cell. Lower bands = lower annual liability.',
    dataSource: 'Valuation Office Agency (synthetic for Phase 1 demo)',
    transform: {
      type: 'categorical',
      mapping: { A: 100, B: 88, C: 76, D: 64, E: 50, F: 35, G: 20, H: 0 },
    },
  },

  // ───── Environment & Health ────────────────────────────────────────────
  {
    id: 'air_quality_no2',
    displayName: 'Air quality (NO₂)',
    category: 'environment',
    unit: 'µg/m³ annual mean',
    direction: 'less_is_better',
    defaultWeight: 5,
    defaultEnabled: true,
    description:
      'Modelled annual mean NO₂ concentration. WHO 2021 guideline is 10 µg/m³; UK legal limit is 40.',
    dataSource: 'DEFRA UK-AIR background maps (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 10, acceptableMax: 40, curve: 'linear' },
  },
  {
    id: 'noise_road',
    displayName: 'Road noise (Lden)',
    category: 'environment',
    unit: 'dB Lden',
    direction: 'less_is_better',
    defaultWeight: 3,
    defaultEnabled: false,
    description: 'Modelled day-evening-night road-traffic noise level.',
    dataSource: 'DEFRA Strategic Noise Maps (synthetic for Phase 1 demo)',
    transform: { type: 'fuzzy_decay', idealMax: 45, acceptableMax: 70, curve: 'linear' },
  },

  // ───── Infrastructure ──────────────────────────────────────────────────
  {
    id: 'broadband_speed',
    displayName: 'Broadband (max available)',
    category: 'infrastructure',
    unit: 'Mbps',
    direction: 'more_is_better',
    defaultWeight: 4,
    defaultEnabled: true,
    description:
      'Maximum advertised download speed available at this address from any fixed provider.',
    dataSource: 'Ofcom Connected Nations (synthetic for Phase 1 demo)',
    transform: { type: 'linear', min: 10, max: 1000 },
  },
  {
    id: 'ptal',
    displayName: 'Transit accessibility (PTAL)',
    category: 'infrastructure',
    unit: 'PTAL 0-6b',
    direction: 'more_is_better',
    defaultWeight: 5,
    defaultEnabled: true,
    description:
      'Public Transport Accessibility Level. London uses 0 (worst) to 6b (best ~8). Outside London use proxy.',
    dataSource: 'TfL WebCAT PTAL (synthetic for Phase 1 demo)',
    transform: { type: 'linear', min: 0, max: 8 },
  },
]

export const CRITERIA_BY_ID: Record<string, CriterionDefinition> =
  Object.fromEntries(CRITERIA.map((c) => [c.id, c]))

/**
 * UK-tuned persona presets. Weights are 0..10 on the UI scale.
 * `enabled` is derived: any criterion with weight > 0 in the preset is on.
 */
export const PRESETS: Preset[] = [
  {
    id: 'family',
    name: 'Family with young kids',
    description:
      'Schools (primary + secondary) and safety dominate. Green space and GP access matter; price gets a moderate weight.',
    weights: {
      flood_risk: 7,
      crime_rate: 8,
      ae_drive_time: 5,
      fire_response: 0,
      primary_school: 10,
      secondary_school: 9,
      gp_walk_time: 5,
      green_space: 7,
      median_price: 5,
      commute_time: 6,
      council_tax: 0,
      air_quality_no2: 6,
      noise_road: 0,
      broadband_speed: 3,
      ptal: 4,
    },
    constraints: [{ criterionId: 'flood_risk', excludeCategories: ['HIGH'] }],
  },
  {
    id: 'retiree',
    name: 'Retiree',
    description:
      'GP / A&E access and walkability dominate. Schools drop out; commute deprioritised; lower council tax matters.',
    weights: {
      flood_risk: 6,
      crime_rate: 7,
      ae_drive_time: 9,
      fire_response: 3,
      primary_school: 0,
      secondary_school: 0,
      gp_walk_time: 9,
      green_space: 7,
      median_price: 5,
      commute_time: 1,
      council_tax: 6,
      air_quality_no2: 6,
      noise_road: 4,
      broadband_speed: 3,
      ptal: 6,
    },
  },
  {
    id: 'remote_pro',
    name: 'Remote-work professional',
    description:
      'Quality of life dominates. Air quality, broadband and green space lead; commute weight low (WFH most days).',
    weights: {
      flood_risk: 5,
      crime_rate: 6,
      ae_drive_time: 3,
      fire_response: 0,
      primary_school: 3,
      secondary_school: 2,
      gp_walk_time: 4,
      green_space: 8,
      median_price: 6,
      commute_time: 2,
      council_tax: 3,
      air_quality_no2: 8,
      noise_road: 5,
      broadband_speed: 9,
      ptal: 4,
    },
  },
  {
    id: 'first_time',
    name: 'First-time buyer (budget)',
    description:
      'Price and council tax dominate. Commute and PTAL matter; schools moderate.',
    weights: {
      flood_risk: 6,
      crime_rate: 6,
      ae_drive_time: 3,
      fire_response: 0,
      primary_school: 5,
      secondary_school: 4,
      gp_walk_time: 4,
      green_space: 4,
      median_price: 10,
      commute_time: 8,
      council_tax: 7,
      air_quality_no2: 4,
      noise_road: 3,
      broadband_speed: 5,
      ptal: 7,
    },
  },
  {
    id: 'investor',
    name: 'Investor / agent',
    description:
      'Hazard exposure and demand drivers (schools, PTAL, broadband). Commute deprioritised.',
    weights: {
      flood_risk: 8,
      crime_rate: 6,
      ae_drive_time: 3,
      fire_response: 0,
      primary_school: 7,
      secondary_school: 6,
      gp_walk_time: 3,
      green_space: 4,
      median_price: 7,
      commute_time: 2,
      council_tax: 4,
      air_quality_no2: 4,
      noise_road: 2,
      broadband_speed: 6,
      ptal: 7,
    },
  },
]

export const PRESETS_BY_ID: Record<string, Preset> = Object.fromEntries(
  PRESETS.map((p) => [p.id, p]),
)
