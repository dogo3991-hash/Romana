import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTraslados(companyId: string | null) {
  return useQuery({
    queryKey: ['traslados', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traslados')
        .select('*')
        .eq('company_id', companyId!)
        .order('nombre')
      if (error) throw error
      return data
    },
    enabled: !!companyId
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateTraslado(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { error } = await supabase.from('traslados').insert({ nombre, company_id: companyId! })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados', companyId] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateTraslado(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { error } = await supabase.from('traslados').update({ nombre }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados', companyId] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteTraslado(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('traslados').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados', companyId] })
    }
  })
}
