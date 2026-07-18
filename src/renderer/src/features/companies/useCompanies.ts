import { useQuery } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw error
      return data
    }
  })
}
