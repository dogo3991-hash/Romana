import { useQuery } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import { fetchAllRows } from '@renderer/lib/fetchAllRows'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useWeighingsInRange(companyId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['weighings-range', companyId, from, to],
    queryFn: () =>
      fetchAllRows<Weighing>((rangeStart, rangeEnd) =>
        supabase
          .from('weighings')
          .select('*')
          .eq('company_id', companyId!)
          .gte('fecha', from)
          .lte('fecha', to)
          .order('fecha')
          .order('hora_entrada')
          .range(rangeStart, rangeEnd)
      ),
    enabled: false
  })
}
