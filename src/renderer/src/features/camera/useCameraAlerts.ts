import { useEffect, useRef } from 'react'
import type { Database } from '@renderer/types/database.types'
import { matchPatente, normalizePatente } from './matchPatente'
import { notifyInfo } from '@renderer/components/ui/toast'
import { subscribeToCameraMessages, type CameraMessage } from './cameraConnection'
import { playTruckAlert } from './truckAlert'

type Weighing = Database['public']['Tables']['weighings']['Row']

// Cuando la cámara duda entre dos camiones, el aviso muestra ambas patentes y
// cuál de ellas tiene un pesaje en espera, para ayudar a completarlo a mano.
function unrecognizedMessage(candidates: unknown, pending: Weighing[]): string {
  const plates = Array.isArray(candidates)
    ? candidates.filter((c): c is string => typeof c === 'string')
    : []
  if (plates.length === 0) {
    return 'La cámara no pudo reconocer el camión: complete el pesaje manualmente.'
  }
  const pendingPlates = new Set(pending.map((w) => normalizePatente(w.patente)))
  const withPending = plates.filter((p) => pendingPlates.has(normalizePatente(p)))
  const hint =
    withPending.length === 1
      ? ` Solo ${withPending[0]} tiene un pesaje en espera.`
      : withPending.length === 0
        ? ' Ninguna tiene un pesaje en espera.'
        : ''
  return `La cámara no pudo reconocer el camión: ¿${plates.join(' o ')}?${hint} Complete el pesaje manualmente.`
}

/**
 * Reacciona a los eventos de SLM-Camara-Romana (proyecto separado, ver isolate-risky-features)
 * usando la conexión WebSocket compartida (cameraConnection.ts). Si ese proceso no está
 * corriendo, simplemente no llegan mensajes — la función es aditiva y nunca bloquea el
 * flujo normal de pesaje.
 */
export function useCameraAlerts(
  pending: Weighing[],
  openEdit: (w: Weighing) => void,
  // Pesaje automático: la cámara reconoció un camión que tiene un pesaje en espera.
  startAutoWeigh: (w: Weighing) => void
): void {
  const pendingRef = useRef(pending)
  const openEditRef = useRef(openEdit)
  const startAutoWeighRef = useRef(startAutoWeigh)

  useEffect(() => {
    pendingRef.current = pending
    openEditRef.current = openEdit
    startAutoWeighRef.current = startAutoWeigh
  }, [pending, openEdit, startAutoWeigh])

  useEffect(() => {
    return subscribeToCameraMessages((payload: CameraMessage) => {
      if (payload.type === 'truck-detected') {
        playTruckAlert()
      } else if (payload.type === 'plate-candidate' && typeof payload.text === 'string') {
        const candidates = pendingRef.current.map((w) => w.patente)
        const match = matchPatente(payload.text, candidates)
        if (match) {
          const weighing = pendingRef.current.find((w) => w.patente === match)
          if (weighing) openEditRef.current(weighing)
        }
      } else if (payload.type === 'truck-identified' && typeof payload.plate === 'string') {
        const plate = normalizePatente(payload.plate)
        const weighing = pendingRef.current.find((w) => normalizePatente(w.patente) === plate)
        if (weighing) startAutoWeighRef.current(weighing)
        else notifyInfo(`La cámara reconoció ${payload.plate}, pero no tiene un pesaje en espera.`)
      } else if (payload.type === 'truck-unrecognized') {
        notifyInfo(unrecognizedMessage(payload.candidates, pendingRef.current), { sticky: true })
      }
    })
  }, [])
}
