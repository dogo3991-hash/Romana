import { useSyncExternalStore } from 'react'
import { supabase } from '@renderer/lib/supabaseClient'
import { drainQueue } from './syncEngine'

export type ConnectivityState = 'online' | 'offline'

const PROBE_INTERVAL_MS = 20_000

let state: ConnectivityState = 'online'
const listeners = new Set<() => void>()
let proberInterval: ReturnType<typeof setInterval> | null = null

function emit(): void {
  for (const listener of listeners) listener()
}

// Se llama despues de cualquier pedido real a Supabase que haya tenido exito
// (lecturas y escrituras), no solo desde el prober. Asi la app vuelve a
// "online" apenas el primer pedido normal funciona, sin esperar el proximo
// tick del prober.
export function reportSuccess(): void {
  if (state === 'offline') {
    state = 'online'
    stopProber()
    emit()
    void drainQueue()
  }
}

export function reportFailure(): void {
  if (state === 'online') {
    state = 'offline'
    emit()
    startProber()
  }
}

async function probe(): Promise<void> {
  try {
    const { error } = await supabase.from('companies').select('id').limit(1)
    if (!error) reportSuccess()
  } catch {
    // Sigue sin conexión — el próximo tick vuelve a intentar.
  }
}

function startProber(): void {
  if (proberInterval) return
  proberInterval = setInterval(() => void probe(), PROBE_INTERVAL_MS)
}

function stopProber(): void {
  if (proberInterval) clearInterval(proberInterval)
  proberInterval = null
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ConnectivityState {
  return state
}

export function useConnectivity(): ConnectivityState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

// Lectura sincronica para usar fuera de componentes React (offlineRepo.ts).
// Si ya sabemos que estamos offline, no tiene sentido esperar el timeout de
// fetch de 15s en cada pedido — vamos directo al dato local, y el prober de
// fondo ya se encarga de detectar cuando vuelve la conexion.
export function getConnectivityState(): ConnectivityState {
  return state
}
