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
