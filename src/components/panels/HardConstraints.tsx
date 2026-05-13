/**
 * Hard-constraint editor — for now, exposed for the categorical criteria that
 * have natural "must not" semantics (flood risk band, Ofsted INADEQUATE).
 *
 * Visually separated from weights so users understand these *exclude*
 * cells rather than down-weight them.
 */
import { Shield } from 'lucide-react'
import { CRITERIA } from '@/lib/catalog'
import { useProfileStore } from '@/state/useProfileStore'
import { cn } from '@/lib/utils'

const CONSTRAINT_OPTIONS: Array<{
  criterionId: string
  label: string
  category: string
}> = [
  { criterionId: 'flood_risk', label: 'Flood risk: HIGH', category: 'HIGH' },
  { criterionId: 'flood_risk', label: 'Flood risk: MEDIUM', category: 'MEDIUM' },
  {
    criterionId: 'primary_school',
    label: 'Primary school: Inadequate',
    category: 'INADEQUATE',
  },
  {
    criterionId: 'secondary_school',
    label: 'Secondary school: Inadequate',
    category: 'INADEQUATE',
  },
  { criterionId: 'council_tax', label: 'Council tax: Band G', category: 'G' },
  { criterionId: 'council_tax', label: 'Council tax: Band H', category: 'H' },
]

export function HardConstraints() {
  const constraints = useProfileStore((s) => s.constraints)
  const toggle = useProfileStore((s) => s.toggleConstraintCategory)

  const isActive = (criterionId: string, cat: string) =>
    constraints.some(
      (c) =>
        c.criterionId === criterionId &&
        c.excludeCategories?.includes(cat),
    )

  // Hide options for criteria that have been disabled.
  const enabled = useProfileStore((s) => s.enabled)
  const visible = CONSTRAINT_OPTIONS.filter((o) => enabled[o.criterionId])

  if (visible.length === 0) return null

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-1.5 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        <Shield className="h-3 w-3" />
        Hard constraints
      </div>
      <p className="px-3 pb-2 text-[11px] text-ink-muted">
        Cells matching any of these are excluded from the heatmap entirely.
      </p>
      <ul className="space-y-1 px-2 pb-3">
        {visible.map((o) => {
          const active = isActive(o.criterionId, o.category)
          const ctx = CRITERIA.find((c) => c.id === o.criterionId)?.displayName
          return (
            <li key={`${o.criterionId}:${o.category}`}>
              <button
                type="button"
                onClick={() => toggle(o.criterionId, o.category)}
                aria-pressed={active}
                title={ctx}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                  active
                    ? 'border-accent bg-accent/10 text-ink-primary'
                    : 'border-border bg-bg-subtle text-ink-secondary hover:border-border-strong',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                    active ? 'bg-accent' : 'bg-bg-base',
                  )}
                />
                <span className="flex-1 truncate">{o.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-ink-muted">
                  {active ? 'On' : 'Off'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
