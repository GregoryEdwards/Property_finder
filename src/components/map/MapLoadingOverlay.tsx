import { AlertTriangle, Loader2 } from 'lucide-react'

interface Props {
  isLoading: boolean
  hasError: boolean
  regionName: string
}

/**
 * Floating status pill rendered over the map while a region's data is
 * fetching or has failed. Intentionally non-blocking: the basemap stays
 * pannable while data loads.
 */
export function MapLoadingOverlay({ isLoading, hasError, regionName }: Props) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-bg-panel/95 px-3 py-1.5 text-xs shadow backdrop-blur">
      {hasError ? (
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>
            Failed to load <span className="font-semibold">{regionName}</span>.
            Check your network and refresh.
          </span>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-ink-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>
            Loading <span className="font-semibold">{regionName}</span>…
          </span>
        </div>
      ) : null}
    </div>
  )
}
