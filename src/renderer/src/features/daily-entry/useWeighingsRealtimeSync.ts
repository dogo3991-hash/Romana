import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// Cada PC conectado corre su propia instancia y todas apuntan al mismo
// proyecto Supabase. Cuando un PC crea o completa un pesaje, esta suscripción
// avisa a los demás para que refresquen su cache local sin intervención
// manual (F5), igual que scaleBroadcast.ts hace para el peso en vivo.
export function useWeighingsRealtimeSync(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    function invalidateAll(): void {
      queryClient.invalidateQueries({ queryKey: ['weighings'] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] })
      queryClient.invalidateQueries({ queryKey: ['daily-breakdown'] })
      queryClient.invalidateQueries({ queryKey: ['last-guia'] })
    }

    const channel = supabase
      .channel('weighings-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weighings' },
        invalidateAll
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'weighings' },
        invalidateAll
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'weighings' },
        invalidateAll
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
