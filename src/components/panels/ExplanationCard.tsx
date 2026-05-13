import { useState } from 'react'
import { ChevronDown, ChevronRight, Sigma } from 'lucide-react'
import { CRITERIA_BY_ID } from '@/lib/catalog'
import type { CellSuitability, CellScores } from '@/lib/types'
import { formatRaw, cn } from '@/lib/utils'
import { suitabilityRGBA } from '@/lib/colorRamp'

interface Props {
  cell: CellScores
  result: CellSuitability
}

/**
 * Explanation card — the trust mechanism. Shows the composite score AND
 * the ordered factor contributions so the user can see *why* a cell
 * scored as it did.
 *
 * Phase 1.7 made the maths explicit: every row spells out
 *     weight % × cell score = contribution
 * so users understand whether a criterion is dominating because it's
 * weighted heavily, because the cell scores well on it, or both.
 * An expandable "How this is calculated" panel renders the full formula
 * for the curious.
 */
export function ExplanationCard({ cell, result }: Props) {
  const [formulaOpen, setFormulaOpen] = useState(false)
  const score = result.score
  const masked = score === null
  const [r, g, b] = suitabilityRGBA(score ?? 0, 255)
  const headerColor = masked ? '#374151' : `rgb(${r}, ${g}, ${b})`

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="flex items-baseline gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md font-mono text-lg font-semibold"
          style={{
            backgroundColor: headerColor,
            color: masked || (score ?? 0) > 60 ? '#0b0f17' : '#ffffff',
          }}
        >
          {masked ? '—' : Math.round(score!)}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-muted">
            {masked ? 'Excluded' : 'Suitability'}
          </div>
          <div className="text-sm text-ink-primary">
            {masked
              ? 'Cell violates an active hard constraint.'
              : `Composite score out of 100`}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-ink-muted">
            {cell.h3}
          </div>
        </div>
      </div>

      {!masked && (
        <>
          {/* How this is calculated — collapsible explainer.
              First-time users can open this to see the WLC formula; power
              users keep it collapsed. */}
          <button
            type="button"
            onClick={() => setFormulaOpen(!formulaOpen)}
            aria-expanded={formulaOpen}
            className="flex items-center justify-between rounded-md border border-border bg-bg-base px-2.5 py-1.5 text-[11px] text-ink-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="inline-flex items-center gap-1.5">
              <Sigma className="h-3 w-3 text-accent" />
              How this is calculated
            </span>
            {formulaOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          {formulaOpen && (
            <div className="rounded-md border border-border bg-bg-base px-2.5 py-2 text-[11px] text-ink-secondary">
              <p>
                Suitability is a <strong>weighted linear combination</strong>{' '}
                (WLC) of the enabled criteria:
              </p>
              <div className="my-1.5 rounded bg-bg-subtle px-2 py-1 font-mono text-[11px] text-ink-primary">
                score = Σ&thinsp;wᵢ&thinsp;·&thinsp;sᵢ
              </div>
              <p className="text-[10px] text-ink-muted">
                <span className="text-ink-secondary">wᵢ</span> is each
                criterion's <em>normalised</em> weight (your slider values
                rescaled so they sum to 100%).{' '}
                <span className="text-ink-secondary">sᵢ</span> is the cell's
                0–100 standardised score for that criterion. Hard
                constraints mask the cell entirely instead of reducing the
                score.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-muted">
            <span>Contribution breakdown</span>
            <span className="font-mono normal-case tracking-normal text-ink-secondary">
              total = {Math.round(score!)}
            </span>
          </div>
          <div className="space-y-2">
            {result.contributions.map((c) => {
              const def = CRITERIA_BY_ID[c.criterionId]
              const raw = cell.raw[c.criterionId]
              const weightPct = Math.round(c.weight * 100)
              const cellScore = Math.round(c.score)
              const contrib = c.contribution
              const pctOfTotal = score ? (contrib / score) * 100 : 0
              return (
                <div key={c.criterionId} className="text-xs">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-ink-primary">
                      {c.displayName}
                    </span>
                    <span className="shrink-0 font-mono text-ink-secondary">
                      {contrib.toFixed(1)}
                      <span className="text-ink-muted"> pts</span>
                    </span>
                  </div>
                  {/* Explicit formula on its own line.
                      e.g. "25% × 88 = 22.0  (29% of total)". */}
                  <div className="mt-0.5 font-mono text-[10px] tabular-nums text-ink-muted">
                    <span className="text-ink-secondary">{weightPct}%</span>{' '}
                    weight × <span className="text-ink-secondary">{cellScore}</span>{' '}
                    score = {contrib.toFixed(1)}
                    <span className="ml-2 text-ink-muted">
                      · {pctOfTotal.toFixed(0)}% of total
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        pctOfTotal > 40
                          ? 'bg-accent'
                          : pctOfTotal > 15
                            ? 'bg-accent/70'
                            : 'bg-accent/40',
                      )}
                      style={{ width: `${Math.min(100, pctOfTotal * 2.5)}%` }}
                    />
                  </div>
                  {def && raw !== undefined && (
                    <div className="mt-0.5 font-mono text-[10px] text-ink-muted">
                      raw: {formatRaw(raw, def.unit)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
