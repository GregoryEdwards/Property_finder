import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  /** Short label shown in the fallback UI — e.g. "property panel". */
  label?: string
  children: ReactNode
  /** Optional override fallback. */
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Generic class-based React error boundary.
 *
 * Class component because hooks can't catch render-time errors — only
 * static `getDerivedStateFromError` + `componentDidCatch` see them.
 *
 * Use this to *contain* failures inside a sub-tree so a single broken
 * widget doesn't blank a whole panel. The Phase-1.5 iframe embed caused
 * a `blank-panel` symptom on listing select; wrapping PropertyDetail in
 * this boundary means a future regression shows a recoverable error UI
 * instead of an empty screen.
 *
 * `key`-based reset: when the parent passes a new `key` (in our case,
 * `selectedListingId` for PropertyDetail), the boundary remounts fresh
 * — so selecting a different listing auto-clears a previous failure.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Console-log the failure so dev can grab the stack trace. Phase 2
    // routes this to Sentry / PostHog instead.
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info)
  }

  private reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col gap-2 px-3 py-4 text-xs">
          <div className="flex items-start gap-2 rounded-md border border-red-700/40 bg-red-900/15 px-3 py-2 text-red-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div>
              <div className="font-semibold">
                Something went wrong rendering the {this.props.label ?? 'view'}.
              </div>
              <div className="mt-0.5 text-red-200/80">
                {this.state.error.message ||
                  'Unknown error — open DevTools for the stack trace.'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex items-center gap-1 self-start rounded-md border border-border bg-bg-subtle px-2 py-1 text-ink-secondary hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RotateCcw className="h-3 w-3" />
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
