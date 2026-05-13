/**
 * Criterion catalog — the 6 Phase-0 criteria for the Austin demo.
 *
 * In Phase 1+, this will be authored as YAML files loaded by the data pipeline.
 * For Phase 0 we ship it as a TypeScript module so the layer panel can render
 * directly from a typed source of truth.
 *
 * Each criterion defines:
 *  - how raw measurements convert to a 0..100 score (the `transform`)
 *  - whether more or less of the raw measurement is desirable (`direction`)
 *  - sensible default weight on the 0..10 UI scale
 *  - optional default hard-constraint suggestions
 *
 * See: requirements §4.2 (Data layers) and tech-spec §3.2 (standardization).
 */
import type { CriterionDefinition, Preset } from './types'

export const CRITERIA: CriterionDefinition[] = [
  {
    id: 'flood_zone',
    displayName: 'Flood risk',
    category: 'safety',
    unit: 'FEMA zone',
    direction: 'category',
    defaultWeight: 7,
    defaultEnabled: true,
    description:
      'FEMA National Flood Hazard Layer. Higher scores indicate lower flood exposure.',
    dataSource: 'FEMA NFHL (synthetic for Austin demo)',
    transform: {
      type: 'categorical',
      mapping: {
        X: 100, // outside the 0.2% annual chance
        X500: 70, // moderate flood hazard
        AE: 25,
        A: 25,
        AO: 30,
        AH: 30,
        VE: 0,
        FLOODWAY: 0,
      },
    },
    defaultHardConstraint: {
      excludeValues: ['VE', 'FLOODWAY'],
    },
  },
  {
    id: 'school_rating',
    displayName: 'School rating',
    category: 'facilities',
    unit: '1-10',
    direction: 'more_is_better',
    defaultWeight: 8,
    defaultEnabled: true,
    description:
      'Aggregate K-12 rating for the elementary attendance area covering this cell.',
    dataSource: 'GreatSchools-style 1-10 scale (synthetic for Austin demo)',
    transform: { type: 'linear', min: 1, max: 10 },
  },
  {
    id: 'crime_index',
    displayName: 'Crime rate',
    category: 'safety',
    unit: 'incidents per 1k residents / yr',
    direction: 'less_is_better',
    defaultWeight: 7,
    defaultEnabled: true,
    description:
      'Annualized rate of Part-I incidents per 1,000 residents. Lower is better.',
    dataSource: 'Austin PD open data (synthetic for Austin demo)',
    transform: {
      type: 'fuzzy_decay',
      idealMax: 10, // ≤ 10 per 1k → perfect
      acceptableMax: 80, // ≥ 80 per 1k → 0
      curve: 'linear',
    },
  },
  {
    id: 'hospital_drive_time',
    displayName: 'Hospital drive time',
    category: 'safety',
    unit: 'minutes',
    direction: 'less_is_better',
    defaultWeight: 5,
    defaultEnabled: true,
    description:
      'Drive time at 8:30 AM weekday from the cell centroid to the nearest Level-I/II trauma center.',
    dataSource: 'OSM + routing engine (synthetic for Austin demo)',
    transform: {
      type: 'fuzzy_decay',
      idealMax: 5,
      acceptableMax: 30,
      curve: 'linear',
    },
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
      'Drive time at the configured departure time from this cell to your primary anchor.',
    dataSource: 'Computed per anchor (TravelTime API in Phase 1)',
    transform: {
      type: 'fuzzy_decay',
      idealMax: 15,
      acceptableMax: 45,
      curve: 'linear',
    },
  },
  {
    id: 'median_home_price',
    displayName: 'Median home price',
    category: 'real_estate',
    unit: 'USD',
    direction: 'less_is_better',
    defaultWeight: 5,
    defaultEnabled: true,
    description:
      'Median single-family sale price over the trailing 12 months for this cell.',
    dataSource: 'MLS comps (synthetic for Austin demo)',
    transform: {
      type: 'fuzzy_decay',
      idealMax: 350_000,
      acceptableMax: 900_000,
      curve: 'linear',
    },
  },
]

export const CRITERIA_BY_ID: Record<string, CriterionDefinition> =
  Object.fromEntries(CRITERIA.map((c) => [c.id, c]))

/** Phase-0 presets. These map directly to personas from the requirements doc. */
export const PRESETS: Preset[] = [
  {
    id: 'family',
    name: 'Family with young kids',
    description:
      'School rating and safety dominate. Hospital access and commute matter; price gets a moderate weight.',
    weights: {
      flood_zone: 7,
      school_rating: 10,
      crime_index: 9,
      hospital_drive_time: 5,
      commute_time: 6,
      median_home_price: 4,
    },
    constraints: [
      {
        criterionId: 'flood_zone',
        excludeCategories: ['VE', 'FLOODWAY', 'AE', 'A'],
      },
    ],
  },
  {
    id: 'retiree',
    name: 'Retiree',
    description:
      'Hospitals and walkability dominate. Schools drop out; commute becomes about errand-running.',
    weights: {
      flood_zone: 6,
      school_rating: 1,
      crime_index: 8,
      hospital_drive_time: 10,
      commute_time: 3,
      median_home_price: 6,
    },
  },
  {
    id: 'remote_pro',
    name: 'Remote-work professional',
    description:
      'Quality of life dominates. Commute weight is low because they work from home most days.',
    weights: {
      flood_zone: 6,
      school_rating: 4,
      crime_index: 7,
      hospital_drive_time: 5,
      commute_time: 2,
      median_home_price: 6,
    },
  },
  {
    id: 'first_time',
    name: 'First-time buyer (budget)',
    description: 'Price dominates. Commute and safety matter; schools moderate.',
    weights: {
      flood_zone: 6,
      school_rating: 6,
      crime_index: 7,
      hospital_drive_time: 4,
      commute_time: 8,
      median_home_price: 10,
    },
  },
  {
    id: 'investor',
    name: 'Investor / agent',
    description:
      'Hazard exposure and price both matter. Schools as a demand proxy. Commute deprioritized.',
    weights: {
      flood_zone: 8,
      school_rating: 7,
      crime_index: 6,
      hospital_drive_time: 3,
      commute_time: 2,
      median_home_price: 8,
    },
  },
]

export const PRESETS_BY_ID: Record<string, Preset> = Object.fromEntries(
  PRESETS.map((p) => [p.id, p]),
)
