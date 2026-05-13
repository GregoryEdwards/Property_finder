import { ArrowDown, ArrowUp, Info, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CriterionDefinition } from '@/lib/types'
import { useProfileStore } from '@/state/useProfileStore'
import { Checkbox } from '@/components/ui/Checkbox'
import { Slider } from '@/components/ui/Slider'
import { cn } from '@/lib/utils'

interface Props {
  criterion: CriterionDefinition
}

const DIRECTION_ICON = {
  more_is_better: ArrowUp,
  less_is_better: ArrowDown,
  category: Tag,
}

/**
 * One row in the priorities panel: enable toggle, name, direction indicator,
 * weight slider, current numeric weight, and an ⓘ info link into the
 * methodology page for full sourcing detail.
 */
export function CriterionRow({ criterion }: Props) {
  const enabled = useProfileStore((s) => s.enabled[criterion.id])
  const weight = useProfileStore((s) => s.weights[criterion.id])
  const setEnabled = useProfileStore((s) => s.setEnabled)
  const setWeight = useProfileStore((s) => s.setWeight)
  const Icon = DIRECTION_ICON[criterion.direction]

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-md border border-transparent px-2 py-2 transition-colors',
        enabled ? 'hover:border-border' : 'opacity-60 hover:opacity-80',
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          checked={enabled}
          onChange={(v) => setEnabled(criterion.id, v)}
          ariaLabel={`${enabled ? 'Disable' : 'Enable'} ${criterion.displayName}`}
        />
        <div className="flex-1 truncate text-sm text-ink-primary">
          {criterion.displayName}
        </div>
        <Link
          to={`/methodology/${criterion.id}`}
          aria-label={`Methodology and sources for ${criterion.displayName}`}
          title="Methodology & sources"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-bg-hover hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Info className="h-3.5 w-3.5" />
        </Link>
        <div
          className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-muted"
          title={
            criterion.direction === 'more_is_better'
              ? 'More is better'
              : criterion.direction === 'less_is_better'
                ? 'Less is better'
                : 'Categorical'
          }
        >
          <Icon className="h-3 w-3" />
          {criterion.direction === 'more_is_better'
            ? 'more'
            : criterion.direction === 'less_is_better'
              ? 'less'
              : 'cat'}
        </div>
      </div>
      <div className="flex items-center gap-3 pl-6">
        <Slider
          value={weight ?? 0}
          onChange={(v) => setWeight(criterion.id, v)}
          min={0}
          max={10}
          step={1}
          disabled={!enabled}
          ariaLabel={`${criterion.displayName} weight`}
        />
        <span className="w-6 shrink-0 text-right font-mono text-xs text-ink-secondary">
          {weight ?? 0}
        </span>
      </div>
    </div>
  )
}
