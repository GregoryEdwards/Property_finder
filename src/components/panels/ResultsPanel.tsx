import { useMemo } from 'react'
import { getAustinCells } from '@/data/loader'
import { CRITERIA } from '@/lib/catalog'
import { scoreCells, indexByH3 } from '@/lib/suitability'
import { useProfileStore } from '@/state/useProfileStore'
import { useUIStore } from '@/state/useUIStore'
import { ExplanationCard } from './ExplanationCard'
import { RankedList } from './RankedList'

/**
 * Right panel. Renders the explanation card for the selected cell (if any),
 * then a ranked top-cells list below.
 *
 * It recomputes scores from the profile store on every change. For ~3k cells
 * this is fractional-millisecond work; useMemo prevents redundant work when
 * unrelated UI state changes (basemap, panel toggles).
 */
export function ResultsPanel() {
  const profile = useProfileStore()
  const selectedH3 = useUIStore((s) => s.selectedH3)

  const cells = useMemo(() => getAustinCells(), [])
  const results = useMemo(
    () => scoreCells(cells, profile, CRITERIA),
    // Re-derive when any profile field meaningfully changes.
    [cells, profile.weights, profile.enabled, profile.constraints],
  )
  const resultsByH3 = useMemo(() => indexByH3(results), [results])

  const selectedCell = selectedH3
    ? cells.find((c) => c.h3 === selectedH3)
    : undefined
  const selectedResult = selectedH3 ? resultsByH3.get(selectedH3) : undefined

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-bg-panel"
      aria-label="Results"
    >
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Results
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          {selectedH3
            ? 'Selected cell breakdown · top cells below.'
            : 'Click any cell on the map to see why it scored as it did.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedCell && selectedResult && (
          <div className="border-b border-border">
            <ExplanationCard cell={selectedCell} result={selectedResult} />
          </div>
        )}
        <RankedList cells={cells} resultsByH3={resultsByH3} />
      </div>
    </aside>
  )
}
