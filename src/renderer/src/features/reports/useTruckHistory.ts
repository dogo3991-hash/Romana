import { useQuery } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

export interface TruckWeighingRecord {
  fecha: string
  carga: number | null
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTruckWeighings(companyId: string | null, patente: string | null) {
  return useQuery({
    queryKey: ['truck-weighings', companyId, patente],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weighings')
        .select('fecha, carga')
        .eq('company_id', companyId!)
        .eq('patente', patente!)
        .order('fecha')
      if (error) throw error
      return data as TruckWeighingRecord[]
    },
    enabled: !!companyId && !!patente
  })
}

export interface TruckPeriodSummary {
  patente: string
  movimientos: number
  peso: number
  transportistaId: string | null
}

// Solo aparecen camiones con al menos un pesaje en el rango — al venir de agrupar
// filas reales de `weighings`, un camión sin movimientos simplemente no genera fila.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTrucksPeriodSummary(companyId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['trucks-period-summary', companyId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weighings')
        .select('patente, carga, transportista_id')
        .eq('company_id', companyId!)
        .gte('fecha', from)
        .lte('fecha', to)
      if (error) throw error
      const byPatente = new Map<string, TruckPeriodSummary>()
      for (const row of data) {
        const entry = byPatente.get(row.patente) ?? {
          patente: row.patente,
          movimientos: 0,
          peso: 0,
          transportistaId: row.transportista_id
        }
        entry.movimientos += 1
        entry.peso += row.carga ?? 0
        byPatente.set(row.patente, entry)
      }
      return [...byPatente.values()].sort((a, b) => b.peso - a.peso)
    },
    enabled: !!companyId && !!from && !!to
  })
}
