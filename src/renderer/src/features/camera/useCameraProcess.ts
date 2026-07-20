import { useState } from 'react'
import { useCameraConnected } from './cameraConnection'

export type CameraProcessState = 'stopped' | 'starting' | 'running'

/**
 * Controla el proceso de SLM-Camara-Romana (arrancar/detener el .exe) y refleja su estado
 * real vía la conexión WebSocket compartida: "running" significa que el programa está
 * corriendo Y contactable, no solo que lo lanzamos nosotros (así también detecta si se
 * abrió a mano o si se cayó inesperadamente).
 */
export function useCameraProcess(): {
  state: CameraProcessState
  start: () => Promise<void>
  stop: () => Promise<void>
  error: string | null
} {
  const connected = useCameraConnected()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const state: CameraProcessState = connected ? 'running' : starting ? 'starting' : 'stopped'

  async function start(): Promise<void> {
    setError(null)
    setStarting(true)
    const result = await window.api.cameraProcess.start()
    if (!result.started) {
      setStarting(false)
      setError(result.error ?? 'No se pudo iniciar la cámara')
    }
    // `state` ya prioriza `connected` sobre `starting`, así que en cuanto conecte se
    // muestra "running" sin esperar este timeout — esto solo cubre el caso en que
    // nunca llegue a conectar, para no dejar "Iniciando…" pegado para siempre.
    setTimeout(() => setStarting(false), 15000)
  }

  async function stop(): Promise<void> {
    setError(null)
    await window.api.cameraProcess.stop()
    setStarting(false)
  }

  return { state, start, stop, error }
}
