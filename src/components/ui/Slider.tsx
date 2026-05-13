import * as RSlider from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

/**
 * Accessible Radix slider with HomeSite-themed styling.
 * Used both for criterion weights and for global opacity controls.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  disabled,
  className,
  ariaLabel,
}: Props) {
  return (
    <RSlider.Root
      className={cn(
        'relative flex h-5 w-full touch-none select-none items-center',
        disabled && 'opacity-40',
        className,
      )}
      value={[value]}
      onValueChange={(v) => onChange(v[0])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <RSlider.Track className="relative h-1.5 grow rounded-full bg-bg-subtle">
        <RSlider.Range className="absolute h-full rounded-full bg-accent" />
      </RSlider.Track>
      <RSlider.Thumb
        className={cn(
          'block h-4 w-4 rounded-full border border-accent bg-bg-base shadow',
          'transition-transform hover:scale-110 focus-visible:scale-110',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        )}
      />
    </RSlider.Root>
  )
}
