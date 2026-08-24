import { useQuery } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

export interface WeighingAuditEntry {
  id: number
  changed_at: string
  changed_by: string | null
  old_data: Record<string, unknown>
  new_data: Record<string, unknown>
  operators: { full_name: string } | null
}

// Se consulta siempre en vivo (sin caché local): es una pantalla de
// diagnóstico ocasional, no parte del flujo offline-first del resto de la app.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useWeighingAudit(weighingId: string | null) {
  return useQuery({
    queryKey: ['weighing-audit', weighingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weighings_audit')
        .select('id, changed_at, changed_by, old_data, new_data, operators:changed_by(full_name)')
        .eq('weighing_id', weighingId!)
        .order('changed_at', { ascending: false })
      if (error) throw error
      return data as unknown as WeighingAuditEntry[]
    },
    enabled: !!weighingId
  })
}
