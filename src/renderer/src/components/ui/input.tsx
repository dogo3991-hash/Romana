import * as React from 'react'
import { cn } from '@renderer/lib/utils'

const UPPERCASE_TYPES = new Set([undefined, 'text'])

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (UPPERCASE_TYPES.has(type)) {
        const { selectionStart, selectionEnd } = e.target
        e.target.value = e.target.value.toUpperCase()
        if (selectionStart !== null && selectionEnd !== null) {
          e.target.setSelectionRange(selectionStart, selectionEnd)
        }
      }
      onChange?.(e)
    }

    return (
      <input
        type={type}
        onChange={handleChange}
        className={cn(
          'flex h-10 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
