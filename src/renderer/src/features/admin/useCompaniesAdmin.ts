import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useAllCompanies() {
  return useQuery({
    queryKey: ['companies-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').order('name')
      if (error) throw error
      return data
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('companies').insert({ name })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies-admin'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values
    }: {
      id: string
      values: { name?: string; active?: boolean }
    }) => {
      const { error } = await supabase.from('companies').update(values).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies-admin'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}
