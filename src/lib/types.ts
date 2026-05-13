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
 * Outbound portal URLs for a listing. Every URL lands the user on a *real,
 * useful* page — synthetic listings, real comparables.
 *
 * Built at seed time by `src/lib/propertyUrl.ts#buildPortalUrls`. Phase 2
 * will replace `rightmoveSearch` with a direct deep-link to the listing
 * once a portal partnership exists; the other URLs remain useful as
 * cross-portal sanity checks.
 */
export interface ListingPortalUrls {
  /** Rightmove for-sale search, postcode + beds + price band. */
  rightmoveSearch: string
  /** Rightmove sold-prices page for the postcode district. */
  rightmoveSoldPrices: string
  /** Zoopla for-sale search. */
  zooplaSearch: string
  /** OnTheMarket for-sale search. */
  onTheMarket: string
  /** Google Maps at the listing coordinates. */
  googleMaps: string
  /** Google Street View at the listing coordinates — real imagery of the
   *  actual street, no API key needed. */
  googleStreetView: string
}

/**
 * A UK property listing. Modelled to match the fields that surface on
 * Rightmove / Zoopla; we'll replace synthetic instances with real feeds
 * in Phase 2 once a licensing path is secured.
 *
 * Phase 1.3 added: photos, propertyUrl, agentName.
 * Phase 1.4 expands propertyUrl into a structured `portals` object so we
 * can offer multi-portal CTAs and direct the user to real comparables on
 * Rightmove / Zoopla / OnTheMarket plus real coordinate-anchored Google
 * Maps + Street View.
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
  /** Ordered photo URLs. photos[0] is the hero; the rest are gallery thumbs.
   *  Phase 1 uses curated Unsplash CC0 photos as examples — they are
   *  *not* photos of the specific property. PropertyDetail surfaces this
   *  honestly via a caption. */
  photos: string[]
  /** Outbound portal deep-links — real Rightmove / Zoopla / OnTheMarket
   *  searches plus Google Maps and Street View at the actual coordinates.
   *  Optional so older cached listing JSON (pre-Phase-1.4) doesn't crash
   *  the UI — `resolveListingPortals()` in `src/lib/listings.ts` provides
   *  a runtime fallback by rebuilding the URLs from lat/lng/postcode/
   *  price/beds. */
  portals?: ListingPortalUrls
  /** Synthetic agency name. */
  agentName: string
}

/** Per-property suitability — composite + ranked contributions. */
export interface PropertySuitability {
  listingId: string
  /** Inherits the cell's composite score (or null if the cell is masked). */
  score: number | null
  contributions: Contribution[]
}

// ─── Pinned properties (user-added) ──────────────────────────────────────

/**
 * A property the user has saved themselves — typically one they found on
 * Rightmove / Zoopla / OnTheMarket and want to score against their
 * profile.
 *
 * Pinned properties are *user-owned data*. They live in `localStorage`
 * (see `usesPinnedStore`) and never sync to the seed JSON. Scoring is the
 * same WLC pipeline as everything else: the pin's `h3` cell looks up its
 * composite score from the active region's `resultsByH3`.
 *
 * `regionId` is captured at save time by `regionForCoords()` so we know
 * which region's dataset can score this pin. A pin outside any supported
 * region is still kept (regionId = null) but shows in the list as
 * "outside supported regions" with no score.
 */
export interface PinnedProperty {
  /** UUID v4 generated at save time. */
  id: string
  /** User-given short name, e.g. "Notting Hill 2-bed". */
  name: string
  /** Coordinates — from postcode geocoding OR the user's map click. */
  lat: number
  lng: number
  /** H3 cell at the same resolution as the seed data (8). Computed at
   *  save time so scoring is O(1). May be null if outside any region. */
  h3: H3Index | null
  /** Region id from `regionForCoords()` at save time. Null if outside
   *  any supported region. */
  regionId: string | null
  /** UK postcode — either typed by the user or reverse-looked-up. */
  postcode?: string
  /** Rightmove / Zoopla / OTM URL the user copied in. */
  externalUrl?: string
  price?: number
  beds?: number
  propertyType?: Listing['propertyType']
  /** Free-text notes. */
  notes?: string
  /** ISO 8601 timestamp set on creation. */
  addedAt: string
  /** ISO 8601 timestamp of the last edit (kept for sort-by-recent). */
  updatedAt: string
}

// ─── Region/seed metadata ────────────────────────────────────────────────

export interface RegionAnchor {
  name: string
  lat: number
  lng: number
}

export interface SeedFile {
  version: number
  generatedAt: string
  region: string
  regionDisplayName: string
  country: string
  h3Resolution: number
  bbox: { west: number; south: number; east: number; north: number }
  anchor: RegionAnchor
  cellCount: number
  cells: CellScores[]
}
