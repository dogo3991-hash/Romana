import { useQuery } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

function dedupe(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort()
}

export interface EntrySuggestions {
  traslados: string[]
}

// Traslado es el único campo que sigue siendo texto libre con memoria por historial;
// Conductor/Patente ahora se eligen de sus registros dedicados (conductors/trucks).
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useEntrySuggestions(companyId: string | null) {
  return useQuery({
    queryKey: ['entry-suggestions', companyId],
    queryFn: async (): Promise<EntrySuggestions> => {
      const { data, error } = await supabase
        .from('weighings')
        .select('traslado')
        .eq('company_id', companyId!)
      if (error) throw error
      return { traslados: dedupe(data?.map((w) => w.traslado) ?? []) }
    },
    enabled: !!companyId
  })
}
