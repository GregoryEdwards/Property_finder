import type { CellSuitability } from '@/lib/types'
import { suitabilityRGBA } from '@/lib/colorRamp'

interface Props {
  /** Cursor coordinates in container space — provided by deck.gl's
   *  picking info (`info.x`, `info.y`). */
  x: number
  y: number
  result: CellSuitability
}

/**
 * Floating tooltip rendered over the map when the user hovers a hex cell.
 *
 * Shows the cell's composite score and its top two contributing criteria
 * so the user gets a quick read on "why this area scores like that"
 * without clicking. Click is still the affordance for the full
 * ExplanationCard.
 *
 * Positioned in container-relative coordinates (x/y are pixels from the
 * container's top-left). We offset slightly so the tooltip doesn't sit
 * under the cursor (would block hover-out detection).
 */
export function MapHoverTip({ x, y, result }: Props) {
  const score = result.score
  if (score === null) return null

  const [r, g, b] = suitabilityRGBA(score, 255)
  const top = result.contributions.slice(0, 2)

  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[180px] rounded-md border border-border bg-bg-panel/95 px-2 py-1.5 text-[11px] shadow-lg backdrop-blur"
      style={{ left: x + 12, top: y + 12 }}
      role="tooltip"
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-9 items-center justify-center rounded font-mono text-xs"
          style={{
            backgroundColor: `rgb(${r}, ${g}, ${b})`,
            color: score > 60 ? '#0b0f17' : '#ffffff',
          }}
        >
          {Math.round(score)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-ink-muted">
          Suitability
        </span>
      </div>
      {top.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t border-border pt-1">
          {top.map((c) => (
            <div
              key={c.criterionId}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate text-ink-secondary">
                {c.displayName}
              </span>
              <span className="shrink-0 font-mono text-ink-muted">
                {Math.round(c.weight * 100)}% ·{' '}
                <span className="text-ink-primary">{Math.round(c.score)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 text-[10px] text-ink-muted">Click for full breakdown</div>
    </div>
  )
}
