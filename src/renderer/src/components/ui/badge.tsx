import { cn } from '@renderer/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'muted'
  className?: string
  children: React.ReactNode
}

const variantClasses = {
  default: 'bg-amber-500/15 text-amber-400',
  success: 'bg-emerald-500/15 text-emerald-400',
  muted: 'bg-neutral-700/50 text-neutral-300'
}

export function Badge({ variant = 'default', className, children }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
