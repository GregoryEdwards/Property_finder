import type { CellScores, CellSuitability } from '@/lib/types'
import { suitabilityRGBA } from '@/lib/colorRamp'
import { useUIStore } from '@/state/useUIStore'

interface Props {
  cells: CellScores[]
  resultsByH3: Map<string, CellSuitability>
}

/**
 * Ranked list of the top-scoring H3 cells in the dataset.
 * Clicking a row selects the cell, which the map listens to in order to
 * pan/flash + open the explanation card.
 *
 * In Phase 1 this becomes a ranked neighborhood list (cells aggregated up to
 * neighborhood / ZIP / tract); for Phase 0 we list raw cells, which is enough
 * to validate the UX.
 */
export function RankedList({ cells, resultsByH3 }: Props) {
  const setSelectedH3 = useUIStore((s) => s.setSelectedH3)

  const ranked = cells
    .map((c) => {
      const r = resultsByH3.get(c.h3)
      return { cell: c, result: r }
    })
    .filter((row): row is { cell: CellScores; result: CellSuitability } => {
      return !!row.result && row.result.score !== null
    })
    .sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0))
    .slice(0, 25)

  if (ranked.length === 0) {
    return (
      <div className="px-3 py-6 text-xs text-ink-muted">
        No cells pass the active hard constraints. Loosen a constraint to see
        results.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-ink-muted">
        Top 25 cells
      </div>
      <ul className="divide-y divide-border">
        {ranked.map((row, idx) => {
          const [r, g, b] = suitabilityRGBA(row.result.score, 255)
          const topFactor = row.result.contributions[0]
          return (
            <li key={row.cell.h3}>
              <button
                type="button"
                onClick={() => setSelectedH3(row.cell.h3)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-bg-hover focus:bg-bg-hover focus:outline-none"
              >
                <span className="w-5 shrink-0 text-right font-mono text-[10px] text-ink-muted">
                  {idx + 1}
                </span>
                <span
                  className="flex h-7 w-9 shrink-0 items-center justify-center rounded font-mono text-xs"
                  style={{
                    backgroundColor: `rgb(${r}, ${g}, ${b})`,
                    color: (row.result.score ?? 0) > 60 ? '#0b0f17' : '#ffffff',
                  }}
                >
                  {Math.round(row.result.score ?? 0)}
                </span>
                <span className="flex-1 truncate">
                  <span className="block font-mono text-[10px] text-ink-muted">
                    {row.cell.h3.slice(0, 8)}…
                  </span>
                  <span className="block truncate text-xs text-ink-secondary">
                    Top: {topFactor?.displayName ?? '—'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
