import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTrucks(companyId: string | null) {
  return useQuery({
    queryKey: ['trucks', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('company_id', companyId!)
        .order('patente')
      if (error) throw error
      return data
    },
    enabled: !!companyId
  })
}

interface TruckInput {
  patente: string
  tara: number
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateTruck(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: TruckInput) => {
      const { error } = await supabase.from('trucks').insert({ ...values, company_id: companyId! })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks', companyId] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateTruck(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TruckInput }) => {
      const { error } = await supabase.from('trucks').update(values).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks', companyId] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteTruck(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trucks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks', companyId] })
    }
  })
}
