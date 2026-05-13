/**
 * Core domain types for HomeSite Phase 0.
 *
 * Designed to match the tech-spec's H3-cell model: each cell carries
 * a 0-100 score per criterion. The runtime suitability engine performs
 * a weighted linear combination (WLC) over these per-cell scores.
 *
 * See: tech-spec §3 (Suitability Engine).
 */

export type CriterionId = string
export type H3Index = string // h3-js returns string indexes by default

/** Whether higher raw values are better or worse for the user. */
export type Direction = 'more_is_better' | 'less_is_better' | 'category'

/** Transform shapes that convert raw measurements to 0-100 scores. */
export type Transform =
  | {
      type: 'linear'
      min: number
      max: number
    }
  | {
      type: 'fuzzy_decay'
      idealMax: number // raw value at or below which the score = 100
      acceptableMax: number // raw value at or above which the score = 0
      curve: 'linear' | 'exponential'
    }
  | {
      type: 'categorical'
      mapping: Record<string, number> // raw category -> 0..100 score
    }

/** Thematic groupings shown in the layer panel. */
export type CategoryId =
  | 'safety'
  | 'employment'
  | 'facilities'
  | 'environment'
  | 'infrastructure'
  | 'demographics'
  | 'real_estate'

/** Static definition of a criterion. Lives in the catalog. */
export interface CriterionDefinition {
  id: CriterionId
  displayName: string
  category: CategoryId
  unit: string
  direction: Direction
  defaultWeight: number // 0..10 (UI scale)
  defaultEnabled: boolean
  description: string
  dataSource: string
  transform: Transform
  /** Optional default hard-constraint suggestions. */
  defaultHardConstraint?: {
    excludeValues?: string[]
    excludeAboveScore?: number
    excludeBelowScore?: number
  }
}

/** A single H3 cell with per-criterion scores. */
export interface CellScores {
  h3: H3Index
  /** criterion id -> 0..100 standardized score */
  scores: Record<CriterionId, number>
  /** criterion id -> raw underlying value (for tooltips/popovers) */
  raw: Record<CriterionId, number | string>
}

/** A user's weight profile (live, in-memory; persistence comes in phase 1). */
export interface WeightProfile {
  id: string
  name: string
  /** criterion id -> weight on the 0..10 UI scale. Normalized at compute time. */
  weights: Record<CriterionId, number>
  /** criterion id -> enabled in WLC */
  enabled: Record<CriterionId, boolean>
  /** Hard constraints: cells violating any are masked out (no score rendered). */
  constraints: HardConstraint[]
}

export interface HardConstraint {
  criterionId: CriterionId
  /** For categorical criteria: the set of raw category values to exclude. */
  excludeCategories?: string[]
  /** Numeric exclusions on the standardized score (0..100). */
  excludeBelowScore?: number
  excludeAboveScore?: number
}

/** Result of running the WLC on a single cell. */
export interface CellSuitability {
  h3: H3Index
  /** 0..100 composite score, or null if any hard constraint was violated. */
  score: number | null
  /** Ordered list of contributions for the explanation popover. */
  contributions: Contribution[]
}

export interface Contribution {
  criterionId: CriterionId
  displayName: string
  weight: number // normalized 0..1
  score: number // standardized 0..100
  contribution: number // weight * score
}

/** A named geographic anchor — e.g. workplace, school, family member's home. */
export interface Anchor {
  id: string
  name: string
  lng: number
  lat: number
  mode: 'drive' | 'transit' | 'walk' | 'bike'
  maxMinutes: number
}

/** Persona presets shipped with the app. */
export interface Preset {
  id: string
  name: string
  description: string
  weights: Record<CriterionId, number>
  constraints?: HardConstraint[]
}
