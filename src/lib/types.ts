/**
 * Core domain types for HomeSite.
 *
 * Phase 1 adds:
 *   - Listing (UK property listing fields - tenure, EPC, council tax band)
 *   - PropertySuitability (per-property scorecard derived from the
 *     cell containing the property)
 *   - Region metadata in the seed file
 *
 * The H3-cell-with-per-criterion-scores model is unchanged from Phase 0;
 * the runtime suitability engine still performs a weighted linear
 * combination over these per-cell scores. See tech-spec §3.
 */

export type CriterionId = string
export type H3Index = string // h3-js returns string indexes by default

export type Direction = 'more_is_better' | 'less_is_better' | 'category'

export type Transform =
  | { type: 'linear'; min: number; max: number }
  | {
      type: 'fuzzy_decay'
      idealMax: number
      acceptableMax: number
      curve: 'linear' | 'exponential'
    }
  | { type: 'categorical'; mapping: Record<string, number> }

export type CategoryId =
  | 'safety'
  | 'employment'
  | 'facilities'
  | 'environment'
  | 'infrastructure'
  | 'demographics'
  | 'real_estate'

export interface CriterionDefinition {
  id: CriterionId
  displayName: string
  category: CategoryId
  unit: string
  direction: Direction
  defaultWeight: number
  defaultEnabled: boolean
  description: string
  dataSource: string
  transform: Transform
  defaultHardConstraint?: {
    excludeValues?: string[]
    excludeAboveScore?: number
    excludeBelowScore?: number
  }
}

export interface CellScores {
  h3: H3Index
  scores: Record<CriterionId, number>
  raw: Record<CriterionId, number | string>
}

export interface WeightProfile {
  id: string
  name: string
  weights: Record<CriterionId, number>
  enabled: Record<CriterionId, boolean>
  constraints: HardConstraint[]
}

export interface HardConstraint {
  criterionId: CriterionId
  excludeCategories?: string[]
  excludeBelowScore?: number
  excludeAboveScore?: number
}

export interface CellSuitability {
  h3: H3Index
  score: number | null
  contributions: Contribution[]
}

export interface Contribution {
  criterionId: CriterionId
  displayName: string
  weight: number
  score: number
  contribution: number
}

export interface Anchor {
  id: string
  name: string
  lng: number
  lat: number
  mode: 'drive' | 'transit' | 'walk' | 'bike'
  maxMinutes: number
}

export interface Preset {
  id: string
  name: string
  description: string
  weights: Record<CriterionId, number>
  constraints?: HardConstraint[]
}

// ─── Phase 1: UK property listings ───────────────────────────────────────

export type Tenure = 'freehold' | 'leasehold' | 'share_of_freehold'
export type EPCBand = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type CouncilTaxBand = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'

/**
 * A UK property listing. Modelled to match the fields that surface on
 * Rightmove / Zoopla; we'll replace synthetic instances with real feeds
 * in Phase 2 once a licensing path is secured.
 */
export interface Listing {
  id: string
  /** Position. */
  lng: number
  lat: number
  /** The H3 cell the listing sits inside — used to inherit the cell's
   *  per-criterion scores for the per-property scorecard. */
  h3: H3Index
  /** Display fields. */
  postcode: string
  addressLine: string
  price: number // GBP
  beds: number
  baths: number
  sqft: number // square feet (Rightmove convention)
  propertyType:
    | 'flat'
    | 'terraced'
    | 'semi_detached'
    | 'detached'
    | 'maisonette'
    | 'bungalow'
  tenure: Tenure
  epc: EPCBand
  councilTaxBand: CouncilTaxBand
  daysOnMarket: number
  /** Stable but synthetic photo placeholder — a Picsum seed id. */
  photoSeed: number
}

/** Per-property suitability — composite + ranked contributions. */
export interface PropertySuitability {
  listingId: string
  /** Inherits the cell's composite score (or null if the cell is masked). */
  score: number | null
  contributions: Contribution[]
}

// ─── Region/seed metadata ────────────────────────────────────────────────

export interface RegionAnchor {
  name: string
  lat: number
  lng: number
}

export interface BBox {
  west: number
  south: number
  east: number
  north: number
}

/**
 * Per-criterion data provenance for a SeedFile.
 *
 * `kind: 'synthetic'` is the Phase 1 default (deterministic generators);
 * `kind: 'real'` indicates a criterion was sourced from a real upstream.
 * The UI methodology page reads this to surface a "REAL" / "SYNTHETIC"
 * badge alongside the source URL and fetch timestamp.
 */
export type CriterionProvenance =
  | {
      kind: 'synthetic'
      generator: string
      seedVersion: number
    }
  | {
      kind: 'real'
      sourceName: string
      sourceUrl: string
      fetchedAt: string
      version?: string
    }

export interface SeedFile {
  version: number
  generatedAt: string
  region: string
  regionDisplayName: string
  country: string
  h3Resolution: number
  bbox: BBox
  anchor: RegionAnchor
  cellCount: number
  cells: CellScores[]
  /** Optional per-criterion provenance map. Absent in legacy seed files. */
  provenance?: Record<CriterionId, CriterionProvenance>
}
