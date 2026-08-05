import { useSyncExternalStore } from 'react'
import { publishWeight, subscribeToRemoteWeight } from './scaleBroadcast'

export type ScaleStatus = 'searching' | 'connected' | 'no-signal'
export interface ScaleWeightMessage {
  weightKg: number
  raw: string
}

// Por debajo de este umbral se considera "báscula vacía" (sin camión encima): no se
// publica nada a Supabase para no gastar cuota de mensajes/mes en horas sin nadie
// pesando. Puesto arbitrariamente por encima del ruido de calibración esperado en 0 kg.
const PUBLISH_WEIGHT_THRESHOLD_KG = 5
// Frecuencia máxima de publicación mientras hay un peso activo por encima del umbral.
const MIN_PUBLISH_INTERVAL_MS = 300
// Igual publica sin cambios cada tanto mientras hay un peso activo, para que el
// watchdog remoto (abajo) no marque "sin señal" con el camión quieto sobre la báscula.
const HEARTBEAT_INTERVAL_MS = 2500
// Cuánto esperar sin recibir nada del canal remoto antes de considerar esa fuente
// "caída" (algo mayor que el WATCHDOG_MS de scaleSerial.ts, para dar margen de red).
const REMOTE_WATCHDOG_MS = 4000

let localStatus: ScaleStatus | null = null
let remoteActive = false
let remoteWatchdogTimer: ReturnType<typeof setTimeout> | null = null

const statusListeners = new Set<() => void>()
const weightListeners = new Set<(msg: ScaleWeightMessage) => void>()

function notifyStatusListeners(): void {
  for (const listener of statusListeners) listener()
}

function setLocalStatus(next: ScaleStatus | null): void {
  if (localStatus === next) return
  localStatus = next
  notifyStatusListeners()
}

function setRemoteActive(next: boolean): void {
  if (remoteActive === next) return
  remoteActive = next
  notifyStatusListeners()
}

function armRemoteWatchdog(): void {
  if (remoteWatchdogTimer) clearTimeout(remoteWatchdogTimer)
  remoteWatchdogTimer = setTimeout(() => setRemoteActive(false), REMOTE_WATCHDOG_MS)
}

let lastPublishAt = 0
let lastPublishedWeightKg: number | null = null
let publishSessionActive = false

// Decide si esta trama local sale a Supabase — ver constantes arriba. El objetivo es
// que el gasto de cuota quede atado a cuántos camiones se pesan por día, no a las
// horas que la app permanece abierta.
function maybePublish(payload: ScaleWeightMessage): void {
  const isAboveThreshold = Math.abs(payload.weightKg) > PUBLISH_WEIGHT_THRESHOLD_KG
  const now = Date.now()

  if (!isAboveThreshold) {
    if (publishSessionActive) {
      // Último mensaje de la sesión, para que los PCs remotos reflejen la vuelta a 0.
      publishWeight(payload)
      lastPublishAt = now
      lastPublishedWeightKg = payload.weightKg
      publishSessionActive = false
    }
    return
  }

  publishSessionActive = true
  const changed = payload.weightKg !== lastPublishedWeightKg
  const dueForHeartbeat = now - lastPublishAt >= HEARTBEAT_INTERVAL_MS
  const rateLimited = now - lastPublishAt < MIN_PUBLISH_INTERVAL_MS

  if (rateLimited && !dueForHeartbeat) return
  if (!changed && !dueForHeartbeat) return

  publishWeight(payload)
  lastPublishAt = now
  lastPublishedWeightKg = payload.weightKg
}

// Suscripción única al cargar el módulo — inofensiva si no hay ninguna sesión de
// lectura activa en el proceso main, ya que en ese caso simplemente no llegan eventos.
window.api.scale.onStatus((payload) => setLocalStatus(payload.status))
window.api.scale.onWeight((payload) => {
  for (const listener of weightListeners) listener(payload)
  maybePublish(payload)
})

// Igual de permanente que la suscripción local: escucha lo que publiquen otros PCs
// (típicamente el que tiene la romana conectada) vía Supabase Realtime.
subscribeToRemoteWeight((payload) => {
  for (const listener of weightListeners) listener(payload)
  setRemoteActive(true)
  armRemoteWatchdog()
})

export function useScaleStatus(): ScaleStatus | null {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener)
      return () => statusListeners.delete(listener)
    },
    () => (localStatus === 'connected' ? 'connected' : remoteActive ? 'connected' : localStatus)
  )
}

export function subscribeToScaleWeight(handler: (msg: ScaleWeightMessage) => void): () => void {
  weightListeners.add(handler)
  return () => weightListeners.delete(handler)
}
