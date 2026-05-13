import { Sliders, ListOrdered, RotateCcw } from 'lucide-react'
import { useUIStore } from '@/state/useUIStore'
import { useProfileStore } from '@/state/useProfileStore'
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
 *  2. View switcher: slider tuning vs drag-to-rank
 *  3. The chosen view
 *  4. Hard constraints (exclude rules)
 *  5. Footer: heatmap opacity (global render control)
 */
export function LayerPanel() {
  const heatmapOpacity = useUIStore((s) => s.heatmapOpacity)
  const setHeatmapOpacity = useUIStore((s) => s.setHeatmapOpacity)
  const priorityView = useUIStore((s) => s.priorityView)
  const setPriorityView = useUIStore((s) => s.setPriorityView)
  const resetToDefaults = useProfileStore((s) => s.resetToDefaults)

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
            Move sliders to rebuild the suitability map.
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

      <div className="border-b border-border px-3 pb-2">
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

      <div className="border-t border-border px-3 py-3">
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
    </aside>
  )
}
