/**
 * Drag-to-rank weight derivation.
 *
 * The user reorders enabled criteria from most → least important; the store
 * converts the ordering into weights via the active `rankScheme`:
 *
 *   - `reciprocal` — w_i ∝ 1/rank_i. Steep differential — rank 1 dominates.
 *   - `linear`     — w_i ∝ N − rank_i + 1. Gentle, near-uniform differential.
 *
 * Both are scaled to the 0..10 UI range so a hop back to Manual mode shows
 * recognisable slider values.
 *
 * Disabled criteria are not shown — toggle them on in Manual mode first.
 */
import { useMemo } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { CRITERIA, CRITERIA_BY_ID } from '@/lib/catalog'
import {
  useProfileStore,
  type RankScheme,
} from '@/state/useProfileStore'
import { useNormalizedWeights } from '@/state/useNormalizedWeights'
import { cn } from '@/lib/utils'

const SCHEME_OPTIONS: Array<{
  value: RankScheme
  label: string
  helper: string
}> = [
  {
    value: 'reciprocal',
    label: 'Reciprocal',
    helper:
      'Rank 1 dominates: weight ∝ 1/rank. Big drop between top ranks.',
  },
  {
    value: 'linear',
    label: 'Linear',
    helper:
      'Even step-down: weight ∝ (N − rank + 1). Gentler differential.',
  },
]

function SortableRow({
  id,
  label,
  rank,
  sharePct,
}: {
  id: string
  label: string
  rank: number
  sharePct: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-bg-subtle px-2 py-2 text-sm',
        isDragging
          ? 'border-accent shadow-lg'
          : 'border-border hover:border-border-strong',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${label}`}
        className="cursor-grab text-ink-muted hover:text-ink-secondary focus:outline-none focus-visible:text-accent active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-bg-base font-mono text-[10px] text-ink-secondary">
        {rank}
      </span>
      <span className="flex-1 truncate text-ink-primary">{label}</span>
      <span
        className={cn(
          'inline-flex h-5 min-w-[2.4rem] items-center justify-center rounded font-mono text-[10px] tabular-nums',
          sharePct >= 40
            ? 'bg-accent text-bg-base'
            : sharePct > 0
              ? 'bg-bg-base text-ink-secondary'
              : 'bg-bg-base text-ink-muted',
        )}
        title="Resulting share of composite score under the active rank scheme"
      >
        {sharePct}%
      </span>
    </li>
  )
}

export function RankView() {
  const enabled = useProfileStore((s) => s.enabled)
  const weights = useProfileStore((s) => s.weights)
  const setOrderedRank = useProfileStore((s) => s.setOrderedRank)
  const rankScheme = useProfileStore((s) => s.rankScheme)
  const setRankScheme = useProfileStore((s) => s.setRankScheme)
  const { weights: normalised } = useNormalizedWeights()

  // Current ordering: sort enabled criteria by current weight desc.
  const orderedIds = useMemo(() => {
    return CRITERIA.filter((c) => enabled[c.id])
      .slice()
      .sort((a, b) => (weights[b.id] ?? 0) - (weights[a.id] ?? 0))
      .map((c) => c.id)
  }, [enabled, weights])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = orderedIds.indexOf(active.id as string)
    const newIdx = orderedIds.indexOf(over.id as string)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(orderedIds, oldIdx, newIdx)
    setOrderedRank(reordered)
  }

  // Switching scheme: immediately re-derive weights with the new scheme
  // for the current order so the user sees the effect right away.
  const onSchemeChange = (s: RankScheme) => {
    setRankScheme(s)
    // Defer to next microtask so the scheme is committed before re-applying.
    queueMicrotask(() => setOrderedRank(orderedIds))
  }

  const activeHelper =
    SCHEME_OPTIONS.find((o) => o.value === rankScheme)?.helper ?? ''

  return (
    <div className="px-2 py-2">
      {/* Rank-scheme selector. Two algorithms for converting drag order
          into weights: the original reciprocal scheme (steep) and a
          linear / rank-sum scheme (gentle). The user picks whichever
          differential matches their intent. */}
      <div className="mb-2 rounded-md border border-border bg-bg-base p-2">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-muted">
          <span>Rank algorithm</span>
        </div>
        <div
          role="radiogroup"
          aria-label="Rank-to-weights algorithm"
          className="grid grid-cols-2 gap-1"
        >
          {SCHEME_OPTIONS.map((o) => {
            const active = rankScheme === o.value
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSchemeChange(o.value)}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                  active
                    ? 'border-accent bg-accent/15 text-ink-primary'
                    : 'border-border bg-bg-subtle text-ink-secondary hover:border-border-strong hover:bg-bg-hover',
                )}
              >
                {o.label}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-ink-muted">
          {activeHelper}
        </p>
      </div>

      <p className="px-2 pb-2 text-[10px] uppercase tracking-wider text-ink-muted">
        Drag to reorder · most important on top
      </p>

      {orderedIds.length === 0 ? (
        <div className="px-2 py-4 text-xs text-ink-muted">
          Enable a criterion in Manual mode first.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {orderedIds.map((id, i) => (
                <SortableRow
                  key={id}
                  id={id}
                  label={CRITERIA_BY_ID[id]?.displayName ?? id}
                  rank={i + 1}
                  sharePct={Math.round((normalised[id] ?? 0) * 100)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
