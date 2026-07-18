import { cn } from '@renderer/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'muted'
  className?: string
  children: React.ReactNode
}

const variantClasses = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  muted: 'bg-line/40 text-muted'
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
