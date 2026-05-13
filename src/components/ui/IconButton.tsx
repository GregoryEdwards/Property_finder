import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  onClick?: () => void
  ariaLabel: string
  active?: boolean
  className?: string
  title?: string
}

export function IconButton({
  children,
  onClick,
  ariaLabel,
  active,
  className,
  title,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-accent text-bg-base'
          : 'text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
    >
      {children}
    </button>
  )
}
