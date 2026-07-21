import { useSyncExternalStore } from 'react'

interface ToastItem {
  id: number
  message: string
}

const DISMISS_MS = 5000

let nextId = 0
let toasts: ToastItem[] = []
const listeners = new Set<() => void>()

function emitChange(): void {
  for (const listener of listeners) listener()
}

// eslint-disable-next-line react-refresh/only-export-components
export function notifyError(message: string): void {
  const id = nextId++
  toasts = [...toasts, { id, message }]
  emitChange()
  setTimeout(() => dismissToast(id), DISMISS_MS)
}

function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
  emitChange()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ToastItem[] {
  return toasts
}

export function ToastViewport(): React.JSX.Element {
  const items = useSyncExternalStore(subscribe, getSnapshot)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm text-danger shadow-lg"
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="text-muted hover:text-ink"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
