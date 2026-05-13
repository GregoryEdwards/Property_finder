import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { CRITERIA } from '@/lib/catalog'
import type { CategoryId } from '@/lib/types'
import {
  METHODOLOGY_BY_ID,
  METHODOLOGY_LAST_REVIEWED,
} from '@/lib/methodology'
import { MethodologyLayout } from './MethodologyLayout'

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
 * Methodology index — one card per criterion grouped by category, with
 * a deep-link into the per-criterion detail page.
 */
export function MethodologyIndex() {
  const byCategory = new Map<CategoryId, typeof CRITERIA>()
  for (const c of CRITERIA) {
    const arr = byCategory.get(c.category) ?? []
    arr.push(c)
    byCategory.set(c.category, arr)
  }

  return (
    <MethodologyLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-primary">
          Methodology
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
          How each criterion in the suitability engine is defined, where the
          underlying data comes from, what we ship today, and what we'll
          ingest in Phase 2.
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-wider text-ink-muted">
          Content last reviewed {METHODOLOGY_LAST_REVIEWED}.
        </p>
      </header>

      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory.get(cat)
          if (!items?.length) return null
          return (
            <section key={cat} aria-labelledby={`hdr-${cat}`}>
              <h2
                id={`hdr-${cat}`}
                className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
              >
                {CATEGORY_LABEL[cat]}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-bg-panel">
                {items.map((c) => {
                  const m = METHODOLOGY_BY_ID[c.id]
                  return (
                    <li key={c.id}>
                      <Link
                        to={`/methodology/${c.id}`}
                        className="flex items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-bg-hover focus:bg-bg-hover focus:outline-none"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink-primary">
                            {c.displayName}
                          </div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-ink-secondary">
                            {m?.whatItMeasures ?? c.description}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-ink-muted">
                            <span className="rounded-sm bg-bg-subtle px-1.5 py-0.5">
                              Unit · {c.unit}
                            </span>
                            <span className="rounded-sm bg-bg-subtle px-1.5 py-0.5">
                              Direction ·{' '}
                              {c.direction === 'more_is_better'
                                ? 'more is better'
                                : c.direction === 'less_is_better'
                                  ? 'less is better'
                                  : 'categorical'}
                            </span>
                            <span className="rounded-sm bg-bg-subtle px-1.5 py-0.5">
                              {m?.realSources.length ?? 0} cited{' '}
                              {m?.realSources.length === 1 ? 'source' : 'sources'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </MethodologyLayout>
  )
}
