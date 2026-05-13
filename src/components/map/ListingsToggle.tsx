import { Home, EyeOff } from 'lucide-react'
import { useUIStore } from '@/state/useUIStore'
import { cn } from '@/lib/utils'

/**
 * Bottom-right floating toggle to show/hide listing pins on the map.
 */
export function ListingsToggle() {
  const show = useUIStore((s) => s.showListings)
  const set = useUIStore((s) => s.setShowListings)
  return (
    <button
      type="button"
      onClick={() => set(!show)}
      aria-pressed={show}
      title={show ? 'Hide listing pins' : 'Show listing pins'}
      className={cn(
        'absolute bottom-3 right-3 flex h-9 items-center gap-2 rounded-md px-3 text-xs shadow backdrop-blur transition-colors',
        show
          ? 'bg-accent text-bg-base hover:bg-accent/90'
          : 'bg-bg-panel/85 text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
      )}
    >
      {show ? <Home className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      <span className="uppercase tracking-wider">Listings</span>
    </button>
  )
}
