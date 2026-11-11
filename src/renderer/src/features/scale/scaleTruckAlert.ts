import { useSyncExternalStore } from 'react'
import { subscribeToScaleWeight } from './scaleConnection'
import {
  sendCameraMessage,
  subscribeToCameraMessages
} from '@renderer/features/camera/cameraConnection'
import { playTruckAlert } from '@renderer/features/camera/truckAlert'
import { notifyInfo } from '@renderer/components/ui/toast'

// "Alerta por romana": alternativa a la detección por cámara que solo hace sonar la
// alerta de camión cuando la báscula supera ALERT_THRESHOLD_KG. No abre ni completa
// pesajes. Para no tener dos alertas a la vez, al activarla se apagan "Iniciar
// detección" y "Pesaje automático" de SLM-Camara-Romana (su imagen sigue viéndose), y
// si el usuario vuelve a prender alguna de esas, esta se apaga.

const ALERT_THRESHOLD_KG = 1000
// Se rearma recién con la romana vacía (mismo umbral que usa scaleConnection.ts), así
// un camión que oscila cerca de 1000 kg al subir, o que se queda arriba, suena una vez.
const REARM_THRESHOLD_KG = 500
const STORAGE_KEY = 'scale-truck-alert'

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

function writeStored(value: boolean): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, 'on')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage no disponible: solo no se recuerda al reiniciar.
  }
}

let enabled = readStored()
let armed = true
let lastWeightKg = 0
const listeners = new Set<() => void>()

subscribeToScaleWeight(({ weightKg }) => {
  lastWeightKg = weightKg
  if (weightKg < REARM_THRESHOLD_KG) {
    armed = true
    return
  }
  if (enabled && armed && weightKg > ALERT_THRESHOLD_KG) {
    armed = false
    playTruckAlert()
    notifyInfo(`Camión sobre la romana (${Math.round(weightKg).toLocaleString('es-CL')} kg)`)
  }
})

subscribeToCameraMessages((message) => {
  if (message.type === 'camera-detection-started' && enabled) {
    setScaleTruckAlertEnabled(false)
    notifyInfo('Alerta por romana desactivada: se activó la detección de la cámara.')
  } else if (message.type === 'hello' && enabled) {
    // La cámara recién se abrió y pudo reanudar su pesaje automático guardado.
    sendCameraMessage({ type: 'stop-camera-detection' })
  }
})

export function setScaleTruckAlertEnabled(value: boolean): void {
  if (enabled === value) return
  enabled = value
  writeStored(value)
  if (value) {
    // Si ya hay un camión arriba al activarla, no suena hasta que la romana se vacíe.
    armed = lastWeightKg < REARM_THRESHOLD_KG
    sendCameraMessage({ type: 'stop-camera-detection' })
  }
  for (const listener of listeners) listener()
}

export function useScaleTruckAlertEnabled(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => enabled
  )
}
