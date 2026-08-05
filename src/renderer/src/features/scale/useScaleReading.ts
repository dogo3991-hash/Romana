import { useState } from 'react'
import { useScaleStatus } from './scaleConnection'

export type ScaleReadingState = 'stopped' | 'searching' | 'connected' | 'no-signal'

// La lectura del puerto serie corre siempre en el proceso main, desde que arranca
// la app — este hook ya no la prende ni la apaga, solo controla si las lecturas
// (locales o recibidas de otro PC por Supabase Realtime) se vuelcan al formulario.
export function useScaleReading(): {
  state: ScaleReadingState
  start: () => void
  stop: () => void
  error: string | null
} {
  const status = useScaleStatus()
  const [active, setActive] = useState(false)

  const state: ScaleReadingState = !active ? 'stopped' : (status ?? 'searching')

  function start(): void {
    setActive(true)
  }

  function stop(): void {
    setActive(false)
  }

  return { state, start, stop, error: null }
}
