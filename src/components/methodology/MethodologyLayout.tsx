import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Map as MapIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
}

/**
 * Shell layout for the methodology section. Reuses the top-bar shape from
 * the map view but trades the basemap controls for a "back to map" link.
 */
export function MethodologyLayout({ children }: Props) {
  const { pathname } = useLocation()
  const onIndex = pathname === '/methodology' || pathname === '/methodology/'

  return (
    <div className="flex h-screen w-screen flex-col bg-bg-base">
      <header className="flex h-12 items-center gap-3 border-b border-border bg-bg-panel px-3">
        <Link
          to="/"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
        >
          <MapIcon className="h-3.5 w-3.5" /> Back to map
        </Link>
        <span className="text-sm font-semibold tracking-tight text-ink-primary">
          HomeSite · Methodology
        </span>
        <span className="text-[10px] uppercase tracking-wider text-ink-muted">
          UK · Phase 1.2
        </span>
        {!onIndex && (
          <Link
            to="/methodology"
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-secondary hover:bg-bg-hover hover:text-ink-primary"
          >
            <ArrowLeft className="h-3 w-3" /> All criteria
          </Link>
        )}
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
