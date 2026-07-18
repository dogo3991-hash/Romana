import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTransportistas() {
  return useQuery({
    queryKey: ['transportistas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transportistas').select('*').order('nombre')
      if (error) throw error
      return data
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateTransportista() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: { nombre: string; rut: string }) => {
      const { error } = await supabase.from('transportistas').insert(values)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportistas'] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateTransportista() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: { nombre: string; rut: string } }) => {
      const { error } = await supabase.from('transportistas').update(values).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportistas'] })
      queryClient.invalidateQueries({ queryKey: ['conductors-admin'] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteTransportista() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transportistas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportistas'] })
      queryClient.invalidateQueries({ queryKey: ['conductors-admin'] })
    }
  })
}

interface ConductorWithTransportista {
  id: string
  nombre: string
  rut: string
  transportista_id: string
  transportistas: { nombre: string } | null
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useAllConductors() {
  return useQuery({
    queryKey: ['conductors-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conductors')
        .select('*, transportistas(nombre)')
        .order('nombre')
      if (error) throw error
      return data as ConductorWithTransportista[]
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useConductorsByTransportista(transportistaId: string | null) {
  return useQuery({
    queryKey: ['conductors-by-transportista', transportistaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conductors')
        .select('nombre, rut')
        .eq('transportista_id', transportistaId!)
        .order('nombre')
      if (error) throw error
      return data
    },
    enabled: !!transportistaId
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateConductor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: { nombre: string; rut: string; transportista_id: string }) => {
      const { error } = await supabase.from('conductors').insert(values)
      if (error) throw error
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['conductors-admin'] })
      queryClient.invalidateQueries({
        queryKey: ['conductors-by-transportista', values.transportista_id]
      })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateConductor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values
    }: {
      id: string
      values: { nombre: string; rut: string; transportista_id: string }
    }) => {
      const { error } = await supabase.from('conductors').update(values).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductors-admin'] })
      queryClient.invalidateQueries({ queryKey: ['conductors-by-transportista'] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteConductor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('conductors').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductors-admin'] })
      queryClient.invalidateQueries({ queryKey: ['conductors-by-transportista'] })
    }
  })
}
