import { supabase } from '@renderer/lib/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RemoteScaleWeightPayload {
  weightKg: number
  raw: string
}

// Canal fijo: cada instalación de la app apunta a su propio proyecto Supabase (una
// romana por sitio), así que no hace falta un identificador de sitio/sucursal para
// separar canales.
const CHANNEL_NAME = 'scale-live-weight'
const WEIGHT_EVENT = 'weight'

let channel: RealtimeChannel | null = null
const remoteWeightListeners = new Set<(payload: RemoteScaleWeightPayload) => void>()

function getChannel(): RealtimeChannel {
  if (channel) return channel
  channel = supabase
    .channel(CHANNEL_NAME, { config: { broadcast: { self: false, ack: false } } })
    .on('broadcast', { event: WEIGHT_EVENT }, ({ payload }) => {
      for (const listener of remoteWeightListeners) {
        listener(payload as RemoteScaleWeightPayload)
      }
    })
    .subscribe()
  return channel
}

// Fire-and-forget: nunca debe frenar el flujo de lecturas locales esperando la
// ida y vuelta de red, y una publicación perdida (ej. sin internet un instante)
// no es grave, la próxima trama la reemplaza.
export function publishWeight(payload: RemoteScaleWeightPayload): void {
  void getChannel()
    .send({ type: 'broadcast', event: WEIGHT_EVENT, payload })
    .catch(() => {})
}

export function subscribeToRemoteWeight(
  handler: (payload: RemoteScaleWeightPayload) => void
): () => void {
  getChannel()
  remoteWeightListeners.add(handler)
  return () => remoteWeightListeners.delete(handler)
}
