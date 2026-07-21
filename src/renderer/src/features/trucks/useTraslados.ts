import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import { getOfflineDb } from '@renderer/lib/offlineDb'
import { readThroughList, createRow, updateRow, deleteRow } from '@renderer/lib/offlineRepo'
import type { Database } from '@renderer/types/database.types'

type Traslado = Database['public']['Tables']['traslados']['Row']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTraslados(companyId: string | null) {
  return useQuery({
    queryKey: ['traslados', companyId],
    queryFn: () =>
      readThroughList<Traslado>({
        remote: () =>
          supabase.from('traslados').select('*').eq('company_id', companyId!).order('nombre'),
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAllFromIndex('traslados', 'by_company', companyId!)
          return rows.sort((a, b) => a.nombre.localeCompare(b.nombre))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('traslados', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      }),
    enabled: !!companyId
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateTraslado(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) =>
      createRow<Traslado, { nombre: string; company_id: string; id?: string }>({
        table: 'traslados',
        values: { nombre, company_id: companyId! },
        remote: (row) => supabase.from('traslados').insert(row).select().single()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados', companyId] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateTraslado(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      updateRow<Traslado, { nombre: string }>({
        table: 'traslados',
        id,
        values: { nombre },
        remote: () => supabase.from('traslados').update({ nombre }).eq('id', id).select().single()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados', companyId] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useDeleteTraslado(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      deleteRow({
        table: 'traslados',
        id,
        remote: () => supabase.from('traslados').delete().eq('id', id)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslados', companyId] })
    }
  })
}
