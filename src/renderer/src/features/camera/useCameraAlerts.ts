import { useEffect, useRef } from 'react'
import type { Database } from '@renderer/types/database.types'
import { matchPatente } from './matchPatente'
import { subscribeToCameraMessages, type CameraMessage } from './cameraConnection'

type Weighing = Database['public']['Tables']['weighings']['Row']

const BEEP_COUNT = 3
const BEEP_SPACING_S = 0.25
const BEEP_PEAK_GAIN = 0.42 // 0.35 + 20%

function playAlertBeeps(): void {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < BEEP_COUNT; i++) {
      const start = ctx.currentTime + i * BEEP_SPACING_S
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(BEEP_PEAK_GAIN, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.2)
    }
    const totalDurationMs = (BEEP_COUNT - 1) * BEEP_SPACING_S * 1000 + 250
    setTimeout(() => void ctx.close(), totalDurationMs)
  } catch {
    // El navegador puede bloquear audio sin gesto del usuario; no es crítico.
  }
}

/**
 * Reacciona a los eventos de SLM-Camara-Romana (proyecto separado, ver isolate-risky-features)
 * usando la conexión WebSocket compartida (cameraConnection.ts). Si ese proceso no está
 * corriendo, simplemente no llegan mensajes — la función es aditiva y nunca bloquea el
 * flujo normal de pesaje.
 */
export function useCameraAlerts(pending: Weighing[], openEdit: (w: Weighing) => void): void {
  const pendingRef = useRef(pending)
  const openEditRef = useRef(openEdit)

  useEffect(() => {
    pendingRef.current = pending
    openEditRef.current = openEdit
  }, [pending, openEdit])

  useEffect(() => {
    return subscribeToCameraMessages((payload: CameraMessage) => {
      if (payload.type === 'truck-detected') {
        playAlertBeeps()
      } else if (payload.type === 'plate-candidate' && typeof payload.text === 'string') {
        const candidates = pendingRef.current.map((w) => w.patente)
        const match = matchPatente(payload.text, candidates)
        if (match) {
          const weighing = pendingRef.current.find((w) => w.patente === match)
          if (weighing) openEditRef.current(weighing)
        }
      }
    })
  }, [])
}
