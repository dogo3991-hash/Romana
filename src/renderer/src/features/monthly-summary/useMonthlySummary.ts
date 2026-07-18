import { useQuery } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDailyBreakdown(companyId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: ['daily-breakdown', companyId, year, month],
    queryFn: async () => {
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const to = `${year}-${String(month).padStart(2, '0')}-31`
      const { data, error } = await supabase
        .from('v_daily_summary')
        .select('*')
        .eq('company_id', companyId!)
        .gte('fecha', from)
        .lte('fecha', to)
        .order('fecha')
      if (error) throw error
      return data
    },
    enabled: !!companyId
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useMonthTotal(companyId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: ['monthly-summary', companyId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_monthly_summary')
        .select('*')
        .eq('company_id', companyId!)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!companyId
  })
}
