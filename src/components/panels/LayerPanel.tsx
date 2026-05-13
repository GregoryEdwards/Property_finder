import { CircleX, Eye, ListOrdered, RotateCcw, Sliders } from 'lucide-react'
import { CRITERIA, CRITERIA_BY_ID } from '@/lib/catalog'
import { useUIStore } from '@/state/useUIStore'
import { useProfileStore } from '@/state/useProfileStore'
import { useNormalizedWeights } from '@/state/useNormalizedWeights'
import { Slider } from '@/components/ui/Slider'
import { PresetPicker } from './PresetPicker'
import { SliderView } from './SliderView'
import { RankView } from './RankView'
import { HardConstraints } from './HardConstraints'
import { cn } from '@/lib/utils'

/**
 * Left panel: priorities.
 *
 * Layout (top → bottom):
 *  1. Preset picker
 *  2. View switcher (Slider / Rank)
 *  3. Live scoring summary: "X of N priorities active · top: <criterion> at Y%"
 *  4. Bulk actions (Disable all / Enable all + Reset)
 *  5. The chosen view (per-criterion rows with live %)
 *  6. Hard constraints (exclude rules)
 *  7. Footer: heatmap opacity + "highlight top X%" threshold
 */
export function LayerPanel() {
  const heatmapOpacity = useUIStore((s) => s.heatmapOpacity)
  const setHeatmapOpacity = useUIStore((s) => s.setHeatmapOpacity)
  const topZonesThreshold = useUIStore((s) => s.topZonesThreshold)
  const setTopZonesThreshold = useUIStore((s) => s.setTopZonesThreshold)
  const priorityView = useUIStore((s) => s.priorityView)
  const setPriorityView = useUIStore((s) => s.setPriorityView)
  const resetToDefaults = useProfileStore((s) => s.resetToDefaults)
  const setEnabled = useProfileStore((s) => s.setEnabled)
  const { enabledCount, topId, topShare } = useNormalizedWeights()
  const totalCount = CRITERIA.length

  const disableAll = () => CRITERIA.forEach((c) => setEnabled(c.id, false))
  const enableAll = () => CRITERIA.forEach((c) => setEnabled(c.id, true))

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-bg-panel"
      aria-label="Priorities"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Priorities
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Toggle, weight, or rank to rebuild the suitability map.
          </p>
        </div>
        <button
          type="button"
          onClick={resetToDefaults}
          className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-ink-secondary hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <PresetPicker />

      {/* Score summary */}
      <div className="border-b border-border bg-bg-base px-3 py-2 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-secondary">
            <span className="font-mono text-ink-primary">
              {enabledCount}
            </span>
            <span className="text-ink-muted"> / {totalCount} </span>
            active
            {enabledCount > 0 && (
              <>
                <span className="text-ink-muted"> · top: </span>
                <span className="text-ink-primary">
                  {topId ? CRITERIA_BY_ID[topId]?.displayName : '—'}
                </span>
                <span className="text-ink-muted"> at </span>
                <span className="font-mono text-ink-primary">
                  {Math.round(topShare * 100)}%
                </span>
              </>
            )}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={enableAll}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Enable every criterion at its current weight"
          >
            <Eye className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
            Enable all
          </button>
          <button
            type="button"
            onClick={disableAll}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Exclude every criterion from the score"
          >
            <CircleX className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
            Disable all
          </button>
        </div>
      </div>

      <div className="border-b border-border px-3 pb-2 pt-1">
        <div
          role="tablist"
          aria-label="Priority view"
          className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-bg-base"
        >
          <button
            role="tab"
            type="button"
            aria-selected={priorityView === 'slider'}
            onClick={() => setPriorityView('slider')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 text-xs transition-colors',
              priorityView === 'slider'
                ? 'bg-accent text-bg-base'
                : 'text-ink-secondary hover:bg-bg-hover',
            )}
          >
            <Sliders className="h-3.5 w-3.5" /> Slider
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={priorityView === 'rank'}
            onClick={() => setPriorityView('rank')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 text-xs transition-colors',
              priorityView === 'rank'
                ? 'bg-accent text-bg-base'
                : 'text-ink-secondary hover:bg-bg-hover',
            )}
          >
            <ListOrdered className="h-3.5 w-3.5" /> Rank
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {priorityView === 'slider' ? <SliderView /> : <RankView />}
        <HardConstraints />
      </div>

      <div className="space-y-3 border-t border-border px-3 py-3">
        <div>
          <label className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-muted">
            <span>Heatmap opacity</span>
            <span className="font-mono text-ink-secondary">
              {Math.round(heatmapOpacity * 100)}%
            </span>
          </label>
          <Slider
            value={heatmapOpacity}
            onChange={setHeatmapOpacity}
            min={0}
            max={1}
            step={0.05}
            ariaLabel="Heatmap opacity"
          />
        </div>

        {/* Top-zones threshold: dims cells scoring below the value, so the
            user can immediately see "where would I focus?". Off by default
            (slider value 0 = no dimming). */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-muted">
            <span>Highlight top zones above</span>
            <span className="font-mono text-ink-secondary">
              {topZonesThreshold === null ? 'off' : `${topZonesThreshold}+`}
            </span>
          </label>
          <Slider
            value={topZonesThreshold ?? 0}
            onChange={(v) => setTopZonesThreshold(v <= 0 ? null : v)}
            min={0}
            max={95}
            step={5}
            ariaLabel="Top-zones threshold"
          />
        </div>
      </div>
    </aside>
  )
}
