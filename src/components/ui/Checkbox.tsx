import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel?: string
  className?: string
}

/**
 * Minimal styled checkbox. Hand-rolled rather than pulled from Radix because
 * we want a single primitive used in dozens of places and Radix's checkbox
 * adds little here.
 */
export function Checkbox({ checked, onChange, ariaLabel, className }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
        checked
          ? 'border-accent bg-accent text-bg-base'
          : 'border-border-strong bg-bg-subtle hover:border-ink-secondary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  )
}
