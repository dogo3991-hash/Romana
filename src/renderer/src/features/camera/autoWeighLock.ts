import { supabase } from '@renderer/lib/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Turno del pesaje automático: un solo PC a la vez completa pesajes con la cámara.
// El que lo toma publica su presencia en este canal; Presence la borra sola si ese
// PC se apaga, se cuelga o pierde la red, así que el turno nunca queda pegado.
// Si dos PCs lo piden a la vez gana el que lo pidió primero ('since').
const CHANNEL_NAME = 'auto-weigh-lock'
const RECONNECT_DELAY_MS = 3000
// Un canal que lleva horas abierto puede quedar conectado a medias sin avisar
// error: el pedido se queda 'pending' para siempre. Si pasa este tiempo sin
// respuesta, se rehace el canal.
const PENDING_TIMEOUT_MS = 10_000

export type LockState =
  | { status: 'idle' }
  // Pedido pero sin respuesta todavía (canal conectándose o sin internet).
  | { status: 'pending' }
  | { status: 'granted' }
  | { status: 'denied'; holder: string }

interface Holder {
  key: string
  host: string
  since: number
}

const clientId = crypto.randomUUID()

let channel: RealtimeChannel | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null
let synced = false
let tracked = false
let wanted: { host: string; since: number } | null = null
let state: LockState = { status: 'idle' }
const listeners = new Set<(state: LockState) => void>()

function log(msg: string): void {
  console.log(`[autoWeighLock] ${msg}`)
}

function clearPendingTimer(): void {
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
}

function setState(next: LockState): void {
  // El plazo corre desde que el pedido queda pendiente, aunque se repita el estado.
  if (next.status !== 'pending') clearPendingTimer()
  else if (!pendingTimer && !reconnectTimer) {
    pendingTimer = setTimeout(() => {
      pendingTimer = null
      if (state.status !== 'pending' || !wanted) return
      log('el turno sigue pendiente, se rehace el canal')
      wanted = { ...wanted, since: Date.now() }
      scheduleReconnect()
    }, PENDING_TIMEOUT_MS)
  }
  if (
    state.status === next.status &&
    (next.status !== 'denied' || (state.status === 'denied' && state.holder === next.holder))
  ) {
    return
  }
  state = next
  for (const listener of listeners) listener(state)
}

function holders(): Holder[] {
  if (!channel) return []
  const result: Holder[] = []
  for (const [key, metas] of Object.entries(
    channel.presenceState<{ host: string; since: number }>()
  )) {
    for (const meta of metas) {
      if (typeof meta.host === 'string' && typeof meta.since === 'number') {
        result.push({ key, host: meta.host, since: meta.since })
      }
    }
  }
  return result
}

function isBefore(a: Holder, b: Holder): boolean {
  return a.since < b.since || (a.since === b.since && a.key < b.key)
}

// Se llama en cada cambio: conexión, sincronización de presencia y pedidos.
function evaluate(): void {
  if (!wanted) {
    setState({ status: 'idle' })
    return
  }
  if (!channel || !synced) {
    setState({ status: 'pending' })
    return
  }
  const all = holders()
  // Una presencia del mismo PC es de un Pesos anterior que se cerró mal y todavía
  // no se borra: no le quita el turno a este.
  const others = all.filter((h) => h.key !== clientId && h.host !== wanted!.host)
  const mine = all.find((h) => h.key === clientId)

  if (!tracked) {
    const first = others.sort((a, b) => (isBefore(a, b) ? -1 : 1))[0]
    if (first) {
      wanted = null
      setState({ status: 'denied', holder: first.host })
      return
    }
    tracked = true
    setState({ status: 'pending' })
    const ch = channel
    void ch.track({ host: wanted.host, since: wanted.since }).then((res) => {
      if (res !== 'ok' && ch === channel) {
        log(`no se pudo tomar el turno (${res})`)
        tracked = false
        scheduleReconnect()
      }
    })
    return
  }

  // Esperando que la presencia propia aparezca en la sincronización.
  if (!mine) {
    setState({ status: 'pending' })
    return
  }
  const earlier = others.find((h) => isBefore(h, mine))
  if (earlier) {
    // Otro PC lo pidió al mismo tiempo y llegó primero.
    wanted = null
    tracked = false
    void channel.untrack()
    setState({ status: 'denied', holder: earlier.host })
    return
  }
  setState({ status: 'granted' })
}

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function dropChannel(): void {
  const dead = channel
  channel = null
  synced = false
  tracked = false
  if (dead) void supabase.removeChannel(dead)
}

// Mismo patrón que scaleBroadcast.ts: un canal caído no vuelve solo.
function scheduleReconnect(): void {
  dropChannel()
  evaluate()
  clearReconnectTimer()
  clearPendingTimer()
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    log('reintentando conexión al canal del turno')
    join()
    evaluate()
  }, RECONNECT_DELAY_MS)
}

function join(): void {
  if (channel) return
  // Canal privado (políticas en la migración 0024).
  const ch = supabase.channel(CHANNEL_NAME, {
    config: { private: true, presence: { key: clientId } }
  })
  channel = ch
  ch.on('presence', { event: 'sync' }, () => {
    if (ch !== channel) return
    synced = true
    evaluate()
  }).subscribe((status, err) => {
    // Avisos de un canal ya soltado (ej. el CLOSED de removeChannel) no cuentan.
    if (ch !== channel) return
    if (status === 'SUBSCRIBED') {
      clearReconnectTimer()
      return
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      log(`canal del turno caído (${status}${err ? `: ${err.message}` : ''}), reconectando`)
      // Al volver se pide de nuevo como un pedido nuevo: si mientras tanto otro PC
      // tomó el turno, se queda con él.
      if (wanted) wanted = { ...wanted, since: Date.now() }
      scheduleReconnect()
    }
  })
}

// Pide el turno para este PC. La respuesta llega por subscribeToLockState.
export function requestLock(host: string): void {
  // Cada pedido lleva respuesta, aunque sea la misma que la anterior.
  state = { status: 'idle' }
  join()
  if (wanted && tracked) {
    evaluate()
    return
  }
  wanted = { host, since: Date.now() }
  evaluate()
}

export function releaseLock(): void {
  wanted = null
  if (tracked && channel) void channel.untrack()
  tracked = false
  evaluate()
}

export function holdsLock(): boolean {
  return state.status === 'granted'
}

export function subscribeToLockState(handler: (state: LockState) => void): () => void {
  listeners.add(handler)
  return () => listeners.delete(handler)
}

// Al cerrar sesión: se suelta el turno y se deja el canal.
export function leaveLockChannel(): void {
  releaseLock()
  clearReconnectTimer()
  clearPendingTimer()
  dropChannel()
}
