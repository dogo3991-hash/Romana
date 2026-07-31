import { useState } from 'react'
import { useScaleStatus, resetScaleStatus } from './scaleConnection'

export type ScaleReadingState = 'stopped' | 'searching' | 'connected' | 'no-signal'

export function useScaleReading(): {
  state: ScaleReadingState
  start: () => Promise<void>
  stop: () => Promise<void>
  error: string | null
} {
  const status = useScaleStatus()
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const state: ScaleReadingState = !active ? 'stopped' : (status ?? 'searching')

  async function start(): Promise<void> {
    setError(null)
    resetScaleStatus()
    setActive(true)
    const result = await window.api.scale.start()
    if (!result.started) {
      setActive(false)
      setError(result.error ?? 'No se pudo iniciar la lectura de la báscula')
    }
  }

  async function stop(): Promise<void> {
    setActive(false)
    resetScaleStatus()
    await window.api.scale.stop()
  }

  return { state, start, stop, error }
}
