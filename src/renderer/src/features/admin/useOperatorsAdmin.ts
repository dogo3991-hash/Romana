import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useAllOperators() {
  return useQuery({
    queryKey: ['operators-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('operators').select('*').order('full_name')
      if (error) throw error
      return data
    }
  })
}

interface CreateOperatorInput {
  email: string
  password: string
  full_name: string
  is_admin: boolean
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateOperator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: CreateOperatorInput) => {
      const { error } = await supabase.functions.invoke('create-operator', { body: values })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators-admin'] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateOperator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values
    }: {
      id: string
      values: { is_admin?: boolean; active?: boolean }
    }) => {
      const { error } = await supabase.from('operators').update(values).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators-admin'] })
    }
  })
}
