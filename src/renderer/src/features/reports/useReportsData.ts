import { useQuery } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useWeighingsInRange(companyId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['weighings-range', companyId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weighings')
        .select('*')
        .eq('company_id', companyId!)
        .gte('fecha', from)
        .lte('fecha', to)
        .order('fecha')
        .order('hora_entrada')
      if (error) throw error
      return data
    },
    enabled: false
  })
}
