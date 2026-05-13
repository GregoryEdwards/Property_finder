import { ArrowDown, ArrowUp, Info, Tag, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { CRITERIA } from '@/lib/catalog'
import type { CriterionDefinition } from '@/lib/types'
import { useProfileStore } from '@/state/useProfileStore'
import { useNormalizedWeights } from '@/state/useNormalizedWeights'
import { Switch } from '@/components/ui/Switch'
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
 * One row in the priorities panel.
 *
 * Layout (left → right):
 *   [Switch] [Name + direction]    [Live weight %] [Solo] [ⓘ Methodology]
 *            [== slider ==] [0..10]
 *
 *   - **Switch** completely excludes the criterion from the suitability
 *     calculation. Renamed and visually elevated from the previous
 *     Checkbox so the affordance reads as ON / OFF.
 *   - **Live weight %** shows the criterion's *normalised* share of the
 *     composite score given the current profile. Updates live as the
 *     user moves any slider — this is the "weighted impact" surface
 *     that lets users feel how much each criterion is actually doing.
 *   - **Solo** sets every other criterion to 0 weight (without
 *     disabling them) so the user can see what the map looks like with
 *     only this factor. One-click undo via the panel-level "Reset".
 *
 * The numeric weight (0..10 on the UI scale) stays on the right of the
 * slider for power users. The live % chip is the headline number for
 * everyone else.
 */
export function CriterionRow({ criterion }: Props) {
  const enabled = useProfileStore((s) => s.enabled[criterion.id])
  const weight = useProfileStore((s) => s.weights[criterion.id])
  const setEnabled = useProfileStore((s) => s.setEnabled)
  const setWeight = useProfileStore((s) => s.setWeight)
  const { weights: normalised } = useNormalizedWeights()
  const Icon = DIRECTION_ICON[criterion.direction]

  const share = enabled ? (normalised[criterion.id] ?? 0) : 0
  const sharePct = Math.round(share * 100)
  const isDominant = sharePct >= 40

  // Solo: zero out every other criterion's weight without changing their
  // enabled state. The user can "Reset to defaults" / "Reset" from the
  // header to undo.
  const soloThis = () => {
    for (const c of CRITERIA) {
      if (c.id === criterion.id) {
        if ((weight ?? 0) === 0) setWeight(c.id, c.defaultWeight)
      } else {
        setWeight(c.id, 0)
      }
    }
  }

  const directionLabel = useMemo(() => {
    if (criterion.direction === 'more_is_better') return 'more is better'
    if (criterion.direction === 'less_is_better') return 'less is better'
    return 'categorical'
  }, [criterion.direction])

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-md border border-transparent px-2 py-2 transition-colors',
        enabled ? 'hover:border-border' : 'opacity-60 hover:opacity-80',
      )}
    >
      {/* Top line: switch, name + direction, live %, solo, info */}
      <div className="flex items-center gap-2">
        <Switch
          checked={!!enabled}
          onChange={(v) => setEnabled(criterion.id, v)}
          ariaLabel={`${enabled ? 'Exclude' : 'Include'} ${criterion.displayName} from suitability`}
        />
        <div className="flex flex-1 min-w-0 items-baseline gap-1.5">
          <span className="truncate text-sm text-ink-primary">
            {criterion.displayName}
          </span>
          <span
            className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-ink-muted"
            title={directionLabel}
          >
            <Icon className="h-2.5 w-2.5" />
          </span>
        </div>

        {enabled ? (
          <span
            className={cn(
              'inline-flex h-5 min-w-[2.4rem] items-center justify-center rounded font-mono text-[10px] tabular-nums',
              isDominant
                ? 'bg-accent text-bg-base'
                : sharePct > 0
                  ? 'bg-bg-subtle text-ink-secondary'
                  : 'bg-bg-base text-ink-muted',
            )}
            title={`Current share of composite score (Σ shares = 100%)`}
          >
            {sharePct}%
          </span>
        ) : (
          <span
            className="inline-flex h-5 items-center rounded bg-bg-base px-1.5 text-[9px] uppercase tracking-wider text-ink-muted"
            title="Excluded from the suitability calculation"
          >
            Excluded
          </span>
        )}

        <button
          type="button"
          onClick={soloThis}
          disabled={!enabled}
          aria-label={`Solo ${criterion.displayName} — zero every other weight`}
          title="Solo this criterion (zero every other weight)"
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-muted transition-colors',
            enabled
              ? 'hover:bg-bg-hover hover:text-accent'
              : 'cursor-not-allowed opacity-40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
        >
          <Target className="h-3 w-3" />
        </button>

        <Link
          to={`/methodology/${criterion.id}`}
          aria-label={`Methodology and sources for ${criterion.displayName}`}
          title="Methodology & sources"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-bg-hover hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Info className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Bottom line: slider + raw UI weight */}
      <div className="flex items-center gap-3 pl-8">
        <Slider
          value={weight ?? 0}
          onChange={(v) => setWeight(criterion.id, v)}
          min={0}
          max={10}
          step={1}
          disabled={!enabled}
          ariaLabel={`${criterion.displayName} weight`}
        />
        <span
          className="w-6 shrink-0 text-right font-mono text-xs text-ink-secondary"
          title="Raw weight on the 0–10 UI scale"
        >
          {weight ?? 0}
        </span>
      </div>
    </div>
  )
}
