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

// Si el canal se cae (PC suspendida y reactivada, corte de wifi, roaming) y no
// vuelve a unirse solo, hay que reintentar; mismo orden de magnitud que
// RESCAN_DELAY_MS en scaleSerial.ts.
const RECONNECT_DELAY_MS = 3000

let channel: RealtimeChannel | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const remoteWeightListeners = new Set<(payload: RemoteScaleWeightPayload) => void>()

function log(msg: string): void {
  console.log(`[scaleBroadcast] ${msg}`)
}

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

// Sin esto, un canal que entra en CHANNEL_ERROR/TIMED_OUT/CLOSED (ej. la PC se
// suspendió y despertó, o hubo un corte de red) queda colgado para siempre: el
// singleton de abajo lo sigue devolviendo en cada getChannel() aunque ya no
// reciba ni publique nada, y ni "Pesar Automático" ni la vista remota se
// recuperan sin reiniciar toda la app.
function scheduleReconnect(): void {
  clearReconnectTimer()
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    log('reintentando conexión al canal remoto')
    getChannel()
  }, RECONNECT_DELAY_MS)
}

function getChannel(): RealtimeChannel {
  if (channel) return channel
  channel = supabase
    .channel(CHANNEL_NAME, { config: { broadcast: { self: false, ack: false } } })
    .on('broadcast', { event: WEIGHT_EVENT }, ({ payload }) => {
      for (const listener of remoteWeightListeners) {
        listener(payload as RemoteScaleWeightPayload)
      }
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        clearReconnectTimer()
        return
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        log(`canal remoto caído (${status}${err ? `: ${err.message}` : ''}), reconectando`)
        const dead = channel
        channel = null
        if (dead) void supabase.removeChannel(dead)
        scheduleReconnect()
      }
    })
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
