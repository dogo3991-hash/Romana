import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

function Dialog({
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>): React.JSX.Element {
  function handleOpenChange(open: boolean): void {
    onOpenChange?.(open)
    if (!open) {
      // Radix can leave `pointer-events: none` stuck on <body> if a dialog closes
      // while another one opens in the same tick (e.g. the ticket dialog opening
      // right as the weighing form closes), leaving the page unresponsive to
      // clicks/typing the next time a dialog is used. This clears it defensively
      // shortly after any dialog closes, regardless of the cause.
      setTimeout(() => {
        document.body.style.removeProperty('pointer-events')
      }, 200)
    }
  }

  return <DialogPrimitive.Root onOpenChange={handleOpenChange} {...props} />
}
const DialogTrigger = DialogPrimitive.Trigger

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface p-6 shadow-lg',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 text-muted hover:text-ink">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn('mb-4 flex flex-col gap-1', className)} {...props} />
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold text-ink', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle }
