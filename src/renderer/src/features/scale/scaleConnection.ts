import { useSyncExternalStore } from 'react'

export type ScaleStatus = 'searching' | 'connected' | 'no-signal'
export interface ScaleWeightMessage {
  weightKg: number
  raw: string
}

let status: ScaleStatus | null = null
const statusListeners = new Set<() => void>()
const weightListeners = new Set<(msg: ScaleWeightMessage) => void>()

function setStatus(next: ScaleStatus | null): void {
  if (status === next) return
  status = next
  for (const listener of statusListeners) listener()
}

// Suscripción única al cargar el módulo — inofensiva si no hay ninguna sesión de
// lectura activa en el proceso main, ya que en ese caso simplemente no llegan eventos.
window.api.scale.onStatus((payload) => setStatus(payload.status))
window.api.scale.onWeight((payload) => {
  for (const listener of weightListeners) listener(payload)
})

export function useScaleStatus(): ScaleStatus | null {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener)
      return () => statusListeners.delete(listener)
    },
    () => status
  )
}

export function subscribeToScaleWeight(handler: (msg: ScaleWeightMessage) => void): () => void {
  weightListeners.add(handler)
  return () => weightListeners.delete(handler)
}

// Limpia el estado "connected"/"no-signal" de la sesión anterior al detener la lectura,
// para que la próxima vez que se active el modo automático no arrastre un estado viejo.
export function resetScaleStatus(): void {
  setStatus(null)
}
