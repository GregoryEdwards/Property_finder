import { MapPinned } from 'lucide-react'
import { REGIONS } from '@/lib/regions'
import { useRegionStore } from '@/state/useRegionStore'

/**
 * Top-bar region picker. Switching the value triggers a TanStack Query
 * refetch (cached after the first request per region) and a map fly-to.
 *
 * Phase 1.1 ships two UK regions; new entries appear automatically once
 * registered in src/lib/regions.ts and the corresponding seed JSON lands in
 * /public/data/regions/.
 */
export function RegionPicker() {
  const activeRegionId = useRegionStore((s) => s.activeRegionId)
  const setActiveRegion = useRegionStore((s) => s.setActiveRegion)
  return (
    <div className="flex items-center gap-1.5">
      <MapPinned className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
      <label htmlFor="region-picker" className="sr-only">
        Region
      </label>
      <select
        id="region-picker"
        value={activeRegionId}
        onChange={(e) => setActiveRegion(e.target.value)}
        className="rounded-md border border-border bg-bg-base px-2 py-1 text-xs text-ink-primary focus:border-accent focus:outline-none"
      >
        {REGIONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.displayName}
          </option>
        ))}
      </select>
    </div>
  )
}
