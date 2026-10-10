import { useSyncExternalStore } from 'react'
import { cn } from '@renderer/lib/utils'

interface ToastItem {
  id: number
  message: string
  tone: 'error' | 'info'
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
  pushToast(message, 'error')
}

// Aviso informativo (no es un error): ej. lo que hizo el pesaje automático.
// sticky = queda en pantalla hasta cerrarlo con la ✕.
// eslint-disable-next-line react-refresh/only-export-components
export function notifyInfo(message: string, options: { sticky?: boolean } = {}): void {
  pushToast(message, 'info', options.sticky)
}

function pushToast(message: string, tone: ToastItem['tone'], sticky = false): void {
  const id = nextId++
  toasts = [...toasts, { id, message, tone }]
  emitChange()
  if (!sticky) setTimeout(() => dismissToast(id), DISMISS_MS)
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
          className={cn(
            'flex items-start gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm shadow-lg',
            t.tone === 'error' ? 'text-danger' : 'text-ink'
          )}
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
