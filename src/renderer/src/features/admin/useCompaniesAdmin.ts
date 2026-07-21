import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import { getOfflineDb } from '@renderer/lib/offlineDb'
import { readThroughList, createRow, updateRow } from '@renderer/lib/offlineRepo'
import type { Database } from '@renderer/types/database.types'

type Company = Database['public']['Tables']['companies']['Row']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useAllCompanies() {
  return useQuery({
    queryKey: ['companies-admin'],
    queryFn: () =>
      readThroughList<Company>({
        remote: () => supabase.from('companies').select('*').order('name'),
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAll('companies')
          return rows.sort((a, b) => a.name.localeCompare(b.name))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('companies', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      })
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      createRow<Company, { name: string; id?: string }>({
        table: 'companies',
        values: { name },
        remote: (row) => supabase.from('companies').insert(row).select().single()
      }),
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
    mutationFn: ({ id, values }: { id: string; values: { name?: string; active?: boolean } }) =>
      updateRow<Company, { name?: string; active?: boolean }>({
        table: 'companies',
        id,
        values,
        remote: () => supabase.from('companies').update(values).eq('id', id).select().single()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies-admin'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}
