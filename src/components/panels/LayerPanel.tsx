import { Fragment } from 'react'
import { CRITERIA } from '@/lib/catalog'
import type { CategoryId } from '@/lib/types'
import { CriterionRow } from './CriterionRow'
import { PresetPicker } from './PresetPicker'
import { useUIStore } from '@/state/useUIStore'
import { Slider } from '@/components/ui/Slider'

const CATEGORY_ORDER: CategoryId[] = [
  'safety',
  'facilities',
  'real_estate',
  'employment',
  'environment',
  'infrastructure',
  'demographics',
]

const CATEGORY_LABEL: Record<CategoryId, string> = {
  safety: 'Safety & Hazard',
  employment: 'Employment & Economy',
  facilities: 'Facilities & Amenities',
  environment: 'Environment & Health',
  infrastructure: 'Infrastructure',
  demographics: 'Demographics & Community',
  real_estate: 'Real Estate',
}

/**
 * Left panel — preset picker, then per-criterion rows grouped by category.
 * Bottom section: heatmap opacity (a global render control).
 */
export function LayerPanel() {
  const heatmapOpacity = useUIStore((s) => s.heatmapOpacity)
  const setHeatmapOpacity = useUIStore((s) => s.setHeatmapOpacity)

  // Group by category, preserving catalog order within each group.
  const byCategory = new Map<CategoryId, typeof CRITERIA>()
  for (const c of CRITERIA) {
    const arr = byCategory.get(c.category) ?? []
    arr.push(c)
    byCategory.set(c.category, arr)
  }

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-bg-panel"
      aria-label="Layers and priorities"
    >
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Priorities
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Move sliders to rebuild the suitability map.
        </p>
      </div>

      <PresetPicker />

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {CATEGORY_ORDER.map((cat) => {
          const rows = byCategory.get(cat)
          if (!rows?.length) return null
          return (
            <Fragment key={cat}>
              <div className="mt-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {CATEGORY_LABEL[cat]}
              </div>
              {rows.map((c) => (
                <CriterionRow key={c.id} criterion={c} />
              ))}
            </Fragment>
          )
        })}
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
