import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import type { Database } from '@renderer/types/database.types'

type HistoricalUpsert = Database['public']['Tables']['historical_monthly_totals']['Insert']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useHistoricalTotals(companyId: string | null) {
  return useQuery({
    queryKey: ['historical-totals', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historical_monthly_totals')
        .select('*')
        .eq('company_id', companyId!)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!companyId
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useHasDetailedData(companyId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: ['has-detailed-data', companyId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_monthly_summary_detailed')
        .select('company_id')
        .eq('company_id', companyId!)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()
      if (error) throw error
      return !!data
    },
    enabled: !!companyId && !!year && !!month
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpsertHistoricalTotal(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: HistoricalUpsert) => {
      const { error } = await supabase
        .from('historical_monthly_totals')
        .upsert(values, { onConflict: 'company_id,year,month' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-totals', companyId] })
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteHistoricalTotal(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('historical_monthly_totals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-totals', companyId] })
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] })
    }
  })
}
