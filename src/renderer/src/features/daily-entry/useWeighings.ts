import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import { getOfflineDb } from '@renderer/lib/offlineDb'
import { readThroughList, createRow, updateRow, deleteRow } from '@renderer/lib/offlineRepo'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']
type WeighingInsert = Database['public']['Tables']['weighings']['Insert']
type WeighingUpdate = Database['public']['Tables']['weighings']['Update']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDailyWeighings(companyId: string | null, fecha: string) {
  return useQuery({
    queryKey: ['weighings', companyId, fecha],
    queryFn: () =>
      readThroughList<Weighing>({
        remote: () =>
          supabase
            .from('weighings')
            .select('*')
            .eq('company_id', companyId!)
            .eq('fecha', fecha)
            .order('hora_entrada'),
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAllFromIndex(
            'weighings',
            'by_company_fecha',
            IDBKeyRange.only([companyId!, fecha])
          )
          return rows.sort((a, b) => a.hora_entrada.localeCompare(b.hora_entrada))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('weighings', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      }),
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
    mutationFn: (values: WeighingInsert) =>
      createRow<Weighing, WeighingInsert>({
        table: 'weighings',
        values,
        remote: (row) => supabase.from('weighings').insert(row).select().single()
      }),
    onSuccess: invalidate
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateWeighing(companyId: string | null, fecha: string) {
  const invalidate = useInvalidateWeighings(companyId, fecha)
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: WeighingUpdate }) =>
      updateRow<Weighing, WeighingUpdate>({
        table: 'weighings',
        id,
        values,
        remote: () => supabase.from('weighings').update(values).eq('id', id).select().single()
      }),
    onSuccess: invalidate
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteWeighing(companyId: string | null, fecha: string) {
  const invalidate = useInvalidateWeighings(companyId, fecha)
  return useMutation({
    mutationFn: (id: string) =>
      deleteRow({
        table: 'weighings',
        id,
        remote: () => supabase.from('weighings').delete().eq('id', id)
      }),
    onSuccess: invalidate
  })
}
