import { LEGEND_STOPS, viridisHex } from '@/lib/colorRamp'

/**
 * Floating legend pinned bottom-left of the map. Anchored to the suitability
 * color ramp; updates implicitly because the ramp is global.
 */
export function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-bg-panel/85 px-3 py-2 text-xs shadow backdrop-blur">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted">
        Suitability
      </div>
      <div className="flex items-center gap-1">
        {LEGEND_STOPS.map((s) => (
          <div key={s} className="flex flex-col items-center">
            <div
              className="h-3 w-9 rounded-sm"
              style={{ backgroundColor: viridisHex(s / 100) }}
            />
            <div className="mt-0.5 font-mono text-[10px] text-ink-secondary">
              {s}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
