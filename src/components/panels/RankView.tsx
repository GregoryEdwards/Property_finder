/**
 * Drag-to-rank weight derivation.
 *
 * The user reorders enabled criteria from most to least important; the store
 * converts the ordering into weights via a rank-reciprocal scheme
 * (w_i ∝ 1/rank_i) and rescales to the 0..10 UI range so switching back to
 * the slider view shows recognisable values.
 *
 * Per the requirements doc, this view is the most intuitive entry point for
 * beginners. Disabled criteria are not shown — toggle them on in the slider
 * view first.
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
import { useProfileStore } from '@/state/useProfileStore'
import { cn } from '@/lib/utils'

function SortableRow({ id, label, rank }: { id: string; label: string; rank: number }) {
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
    </li>
  )
}

export function RankView() {
  const enabled = useProfileStore((s) => s.enabled)
  const weights = useProfileStore((s) => s.weights)
  const setOrderedRank = useProfileStore((s) => s.setOrderedRank)

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

  if (orderedIds.length === 0) {
    return (
      <div className="px-3 py-6 text-xs text-ink-muted">
        Enable a criterion in the slider view first.
      </div>
    )
  }

  return (
    <div className="px-2 py-2">
      <p className="px-2 pb-2 text-[10px] uppercase tracking-wider text-ink-muted">
        Drag to reorder · most important on top
      </p>
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
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
