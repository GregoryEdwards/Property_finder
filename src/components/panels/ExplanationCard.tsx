import { CRITERIA_BY_ID } from '@/lib/catalog'
import type { CellSuitability, CellScores } from '@/lib/types'
import { formatRaw, cn } from '@/lib/utils'
import { suitabilityRGBA } from '@/lib/colorRamp'

interface Props {
  cell: CellScores
  result: CellSuitability
}

/**
 * Explanation card — the most important UX feature in Phase 0.
 * Lists the composite score and the ordered factor contributions so the user
 * understands *why* a cell scored as it did.
 *
 * Per the requirements doc, we always show breakdowns, never the score alone.
 */
export function ExplanationCard({ cell, result }: Props) {
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
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">
            Contribution breakdown
          </div>
          <div className="space-y-2">
            {result.contributions.map((c) => {
              const def = CRITERIA_BY_ID[c.criterionId]
              const raw = cell.raw[c.criterionId]
              const pctOfTotal = score ? (c.contribution / score) * 100 : 0
              return (
                <div key={c.criterionId} className="text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-ink-primary">{c.displayName}</span>
                    <span className="font-mono text-ink-secondary">
                      {c.contribution.toFixed(1)}
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
                  <div className="mt-0.5 flex justify-between font-mono text-[10px] text-ink-muted">
                    <span>
                      {def && raw !== undefined
                        ? formatRaw(raw, def.unit)
                        : '—'}{' '}
                      · score {Math.round(c.score)}
                    </span>
                    <span>weight {(c.weight * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
