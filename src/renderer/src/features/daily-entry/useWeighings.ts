import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import type { Database } from '@renderer/types/database.types'

type WeighingInsert = Database['public']['Tables']['weighings']['Insert']
type WeighingUpdate = Database['public']['Tables']['weighings']['Update']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDailyWeighings(companyId: string | null, fecha: string) {
  return useQuery({
    queryKey: ['weighings', companyId, fecha],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weighings')
        .select('*')
        .eq('company_id', companyId!)
        .eq('fecha', fecha)
        .order('hora_entrada')
      if (error) throw error
      return data
    },
    enabled: !!companyId && !!fecha
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDailySummary(companyId: string | null, fecha: string) {
  return useQuery({
    queryKey: ['daily-summary', companyId, fecha],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_daily_summary')
        .select('*')
        .eq('company_id', companyId!)
        .eq('fecha', fecha)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!companyId
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useMonthSummary(companyId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: ['monthly-summary-detailed', companyId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_monthly_summary_detailed')
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

function useInvalidateWeighings(companyId: string | null, fecha: string): () => void {
  const queryClient = useQueryClient()
  const [year, month] = fecha.split('-').map(Number)
  return () => {
    queryClient.invalidateQueries({ queryKey: ['weighings', companyId, fecha] })
    queryClient.invalidateQueries({ queryKey: ['daily-summary', companyId, fecha] })
    queryClient.invalidateQueries({
      queryKey: ['monthly-summary-detailed', companyId, year, month]
    })
    queryClient.invalidateQueries({ queryKey: ['monthly-summary'] })
    queryClient.invalidateQueries({ queryKey: ['daily-breakdown', companyId, year, month] })
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateWeighing(companyId: string | null, fecha: string) {
  const invalidate = useInvalidateWeighings(companyId, fecha)
  return useMutation({
    mutationFn: async (values: WeighingInsert) => {
      const { data, error } = await supabase.from('weighings').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: invalidate
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateWeighing(companyId: string | null, fecha: string) {
  const invalidate = useInvalidateWeighings(companyId, fecha)
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: WeighingUpdate }) => {
      const { data, error } = await supabase
        .from('weighings')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: invalidate
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteWeighing(companyId: string | null, fecha: string) {
  const invalidate = useInvalidateWeighings(companyId, fecha)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('weighings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate
  })
}
