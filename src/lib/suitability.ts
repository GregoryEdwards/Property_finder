/**
 * Suitability engine — runs the weighted linear combination over H3 cells.
 *
 * Inputs:
 *   - per-cell standardized scores (0..100 per criterion), provided by the
 *     server / pipeline. In Phase 0 these come from the synthetic seed file.
 *   - the user's WeightProfile (which criteria are enabled, their weights, and
 *     any hard constraints).
 *
 * Outputs:
 *   - per-cell composite score (0..100, or null if a hard constraint is violated)
 *   - the ordered list of contributions, used by the explanation popover.
 *
 * The math is intentionally trivial — a weighted sum of pre-standardized scores.
 * The work of the engine is upstream (standardization in catalog.ts) and
 * downstream (rendering in components/map). This file owns the *runtime*.
 *
 * See: tech-spec §3.3 (the runtime calculation).
 */
import type {
  CellScores,
  CellSuitability,
  Contribution,
  CriterionDefinition,
  HardConstraint,
  WeightProfile,
} from './types'

/**
 * Normalize the UI-scale weights (0..10) into a probability vector that sums
 * to 1.0, restricted to currently-enabled criteria. Returns an empty record
 * if no criteria are enabled — in that case scores should not be computed.
 */
export function normalizeWeights(
  profile: WeightProfile,
  catalog: CriterionDefinition[],
): Record<string, number> {
  let total = 0
  const raw: Record<string, number> = {}
  for (const c of catalog) {
    if (!profile.enabled[c.id]) continue
    const w = Math.max(0, profile.weights[c.id] ?? c.defaultWeight)
    if (w === 0) continue
    raw[c.id] = w
    total += w
  }
  if (total === 0) return {}
  const normalized: Record<string, number> = {}
  for (const id in raw) normalized[id] = raw[id] / total
  return normalized
}

/**
 * True if the cell violates any of the profile's hard constraints.
 * A masked cell is rendered as transparent — never colored as "low score".
 * Distinguishing "ineligible" from "scored low" is a critical UX guardrail.
 */
export function violatesConstraints(
  cell: CellScores,
  constraints: HardConstraint[],
): boolean {
  for (const c of constraints) {
    const raw = cell.raw[c.criterionId]
    const score = cell.scores[c.criterionId]
    if (c.excludeCategories && typeof raw === 'string') {
      if (c.excludeCategories.includes(raw)) return true
    }
    if (
      c.excludeBelowScore !== undefined &&
      typeof score === 'number' &&
      score < c.excludeBelowScore
    ) {
      return true
    }
    if (
      c.excludeAboveScore !== undefined &&
      typeof score === 'number' &&
      score > c.excludeAboveScore
    ) {
      return true
    }
  }
  return false
}

/**
 * Compute the suitability of a single cell.
 * O(criteria) — typically ~10-30 multiplications.
 */
export function scoreCell(
  cell: CellScores,
  profile: WeightProfile,
  catalog: CriterionDefinition[],
  normalizedWeights?: Record<string, number>,
): CellSuitability {
  if (violatesConstraints(cell, profile.constraints)) {
    return { h3: cell.h3, score: null, contributions: [] }
  }
  const weights = normalizedWeights ?? normalizeWeights(profile, catalog)
  let composite = 0
  const contributions: Contribution[] = []
  for (const c of catalog) {
    const w = weights[c.id]
    if (!w) continue
    const s = cell.scores[c.id]
    if (s === undefined) continue // missing data: silently skip
    const contribution = w * s
    composite += contribution
    contributions.push({
      criterionId: c.id,
      displayName: c.displayName,
      weight: w,
      score: s,
      contribution,
    })
  }
  contributions.sort((a, b) => b.contribution - a.contribution)
  return { h3: cell.h3, score: composite, contributions }
}

/**
 * Batch-score every cell. The whole-viewport version called by the map layer.
 * Pre-computes the normalized weight vector once, then loops.
 *
 * For Phase 0 (≤ a few thousand cells) this runs in JS in well under 50 ms.
 * Phase 2 will move the hot loop into a deck.gl shader for >50k cells.
 */
export function scoreCells(
  cells: CellScores[],
  profile: WeightProfile,
  catalog: CriterionDefinition[],
): CellSuitability[] {
  const weights = normalizeWeights(profile, catalog)
  const out: CellSuitability[] = new Array(cells.length)
  for (let i = 0; i < cells.length; i++) {
    out[i] = scoreCell(cells[i], profile, catalog, weights)
  }
  return out
}

/** Index a list of results by H3 cell for O(1) lookup on hover/click. */
export function indexByH3(
  results: CellSuitability[],
): Map<string, CellSuitability> {
  const m = new Map<string, CellSuitability>()
  for (const r of results) m.set(r.h3, r)
  return m
}
