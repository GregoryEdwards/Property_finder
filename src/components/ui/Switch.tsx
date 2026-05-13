import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel?: string
  /** Disable interaction (cursor + colour stay; clicks no-op). */
  disabled?: boolean
  className?: string
}

/**
 * Two-state toggle switch — used where the affordance must read as
 * "ON / OFF" rather than the more ambiguous "checked / unchecked" of a
 * checkbox.
 *
 * Used on each CriterionRow to signal "include this criterion in the
 * composite suitability score?" — a question the old Checkbox didn't
 * communicate clearly enough.
 */
export function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled,
  className,
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border transition-colors',
        checked
          ? 'border-accent bg-accent'
          : 'border-border-strong bg-bg-subtle hover:border-ink-secondary',
        disabled && 'cursor-not-allowed opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-panel',
        className,
      )}
    >
      <span
        className={cn(
          'absolute top-[1px] h-[12px] w-[12px] rounded-full bg-bg-base transition-transform',
          checked ? 'translate-x-[13px]' : 'translate-x-[1px]',
        )}
      />
    </button>
  )
}
