import { MapPin, X } from 'lucide-react'
import { useUIStore } from '@/state/useUIStore'
import { cn } from '@/lib/utils'

/**
 * Floating toolbar button to enter/exit pin-drop mode.
 *
 * When the user toggles this on:
 *   - the cursor becomes a crosshair via MapView's `getCursor`
 *   - a hint banner appears on the map ("Click anywhere to drop a pin")
 *   - the next deck.gl onClick captures the coordinate and writes it to
 *     `useUIStore.pendingPinDrop`
 *   - the Pinned tab opens the AddPinnedForm pre-filled with that
 *     coordinate
 *
 * Lives in the same lower-right area as the listings toggle, stacked.
 */
export function PinDropToggle() {
  const pinDropMode = useUIStore((s) => s.pinDropMode)
  const setPinDropMode = useUIStore((s) => s.setPinDropMode)
  const setRightTab = useUIStore((s) => s.setRightTab)

  return (
    <button
      type="button"
      onClick={() => {
        const next = !pinDropMode
        setPinDropMode(next)
        // Switch focus to the Pinned tab so the form is visible when a
        // drop completes.
        if (next) setRightTab('pinned')
      }}
      aria-pressed={pinDropMode}
      title={pinDropMode ? 'Cancel pin drop' : 'Drop a pin on the map'}
      className={cn(
        'absolute bottom-14 right-3 flex h-9 items-center gap-2 rounded-md px-3 text-xs shadow backdrop-blur transition-colors',
        pinDropMode
          ? 'bg-accent text-bg-base hover:bg-accent/90'
          : 'bg-bg-panel/85 text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
      )}
    >
      {pinDropMode ? <X className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
      <span className="uppercase tracking-wider">
        {pinDropMode ? 'Cancel pin' : 'Add pin'}
      </span>
    </button>
  )
}
