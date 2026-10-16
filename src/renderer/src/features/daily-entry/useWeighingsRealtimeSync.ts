import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@renderer/lib/supabaseClient'

// Mismo orden de magnitud que scaleBroadcast.ts / autoWeighLock.ts.
const RECONNECT_DELAY_MS = 3000

function log(msg: string): void {
  console.log(`[weighingsRealtime] ${msg}`)
}

// Cada PC conectado corre su propia instancia y todas apuntan al mismo
// proyecto Supabase. Cuando un PC crea o completa un pesaje, esta suscripción
// avisa a los demás para que refresquen su cache local sin intervención
// manual (F5), igual que scaleBroadcast.ts hace para el peso en vivo.
export function useWeighingsRealtimeSync(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    function invalidateAll(): void {
      queryClient.invalidateQueries({ queryKey: ['weighings'] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] })
      queryClient.invalidateQueries({ queryKey: ['daily-breakdown'] })
      queryClient.invalidateQueries({ queryKey: ['last-guia'] })
    }

    function onChange(payload: { eventType: string }): void {
      log(`cambio recibido (${payload.eventType})`)
      invalidateAll()
    }

    // Sin esto, si el canal se cae (PC suspendida, corte de wifi, token vencido)
    // queda muerto en silencio y la lista deja de actualizarse sola hasta
    // reiniciar la app. Antes lo "arreglaba" por accidente el remontaje de toda la
    // app en cada renovación de sesión (eliminado en ff067ca).
    function join(): void {
      if (disposed || channel) return
      // Nombre único por intento: si removeChannel no logra cerrar el canal viejo
      // (típico cuando ya estaba caído) queda registrado, y supabase.channel() con
      // el mismo nombre devolvería ese mismo canal muerto en vez de uno nuevo.
      const ch = supabase
        .channel(`weighings-changes-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weighings' }, onChange)
      channel = ch
      ch.subscribe((status, err) => {
        // Avisos de un canal ya soltado (ej. el CLOSED de removeChannel) no cuentan.
        if (ch !== channel) return
        if (status === 'SUBSCRIBED') {
          log('suscrito')
          // Lo que cambió mientras el canal estuvo caído no llegó por realtime.
          invalidateAll()
          return
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          log(`canal caído (${status}${err ? `: ${err.message}` : ''}), reconectando`)
          channel = null
          void supabase.removeChannel(ch)
          scheduleReconnect()
        }
      })
    }

    function scheduleReconnect(): void {
      if (disposed) return
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        join()
      }, RECONNECT_DELAY_MS)
    }

    join()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      const ch = channel
      channel = null
      if (ch) void supabase.removeChannel(ch)
    }
  }, [queryClient])
}
