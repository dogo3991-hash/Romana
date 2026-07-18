import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import type { Database } from '@renderer/types/database.types'

type TruckWithTransportista = Database['public']['Tables']['trucks']['Row'] & {
  transportistas: { nombre: string } | null
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useAllTrucks() {
  return useQuery({
    queryKey: ['trucks-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*, transportistas(nombre)')
        .order('patente')
      if (error) throw error
      return data as TruckWithTransportista[]
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTrucksByTransportista(transportistaId: string | null) {
  return useQuery({
    queryKey: ['trucks-by-transportista', transportistaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('patente, tara')
        .eq('transportista_id', transportistaId!)
        .order('patente')
      if (error) throw error
      return data
    },
    enabled: !!transportistaId
  })
}

interface TruckInput {
  patente: string
  tara: number
  transportista_id: string
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateTruck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: TruckInput) => {
      const { error } = await supabase.from('trucks').insert(values)
      if (error) throw error
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['trucks-admin'] })
      queryClient.invalidateQueries({
        queryKey: ['trucks-by-transportista', values.transportista_id]
      })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateTruck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TruckInput }) => {
      const { error } = await supabase.from('trucks').update(values).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks-admin'] })
      queryClient.invalidateQueries({ queryKey: ['trucks-by-transportista'] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteTruck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trucks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks-admin'] })
      queryClient.invalidateQueries({ queryKey: ['trucks-by-transportista'] })
    }
  })
}
