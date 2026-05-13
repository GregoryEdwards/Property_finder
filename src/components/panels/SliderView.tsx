import { Fragment } from 'react'
import { CRITERIA } from '@/lib/catalog'
import type { CategoryId } from '@/lib/types'
import { CriterionRow } from './CriterionRow'

const CATEGORY_ORDER: CategoryId[] = [
  'safety',
  'facilities',
  'real_estate',
  'environment',
  'infrastructure',
  'employment',
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
 * Per-criterion sliders, grouped by category. The classic "fine-tune"
 * weight view — every criterion exposed with a numeric weight 0..10.
 */
export function SliderView() {
  const byCategory = new Map<CategoryId, typeof CRITERIA>()
  for (const c of CRITERIA) {
    const arr = byCategory.get(c.category) ?? []
    arr.push(c)
    byCategory.set(c.category, arr)
  }

  return (
    <div className="px-2 pb-4">
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
  )
}
