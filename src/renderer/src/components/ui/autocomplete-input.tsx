import { useState } from 'react'
import { Input } from './input'
import { cn } from '@renderer/lib/utils'

interface AutocompleteInputProps {
  value: string
  onValueChange: (value: string) => void
  onSelect?: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
}

export function AutocompleteInput({
  value,
  onValueChange,
  onSelect,
  options,
  placeholder,
  className
}: AutocompleteInputProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  const matches =
    value.trim().length > 0
      ? options.filter((o) => o.toUpperCase().startsWith(value.toUpperCase())).slice(0, 8)
      : []

  const showList = open && matches.length > 0 && !(matches.length === 1 && matches[0] === value)

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {showList && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 shadow-lg">
          {matches.map((option) => (
            <li key={option}>
              <button
                type="button"
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm text-neutral-200 hover:bg-neutral-800'
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onValueChange(option)
                  onSelect?.(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
