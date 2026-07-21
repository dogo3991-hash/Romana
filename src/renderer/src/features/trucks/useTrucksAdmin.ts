import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import { getOfflineDb } from '@renderer/lib/offlineDb'
import { readThroughList, createRow, updateRow, deleteRow } from '@renderer/lib/offlineRepo'
import type { Database } from '@renderer/types/database.types'

type Truck = Database['public']['Tables']['trucks']['Row']
type TruckWithTransportista = Truck & {
  transportistas: { nombre: string } | null
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useAllTrucks() {
  return useQuery({
    queryKey: ['trucks-admin'],
    queryFn: async () => {
      const trucks = await readThroughList<Truck>({
        remote: async () => {
          const { data, error } = await supabase
            .from('trucks')
            .select('*, transportistas(nombre)')
            .order('patente')
          return { data: data as Truck[] | null, error }
        },
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAll('trucks')
          return rows.sort((a, b) => a.patente.localeCompare(b.patente))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('trucks', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      })
      const db = await getOfflineDb()
      const transportistas = await db.getAll('transportistas')
      const byId = new Map(transportistas.map((t) => [t.id, t]))
      return trucks.map((t) => ({
        ...t,
        transportistas: t.transportista_id ? (byId.get(t.transportista_id) ?? null) : null
      })) as TruckWithTransportista[]
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTrucksByTransportista(transportistaId: string | null) {
  return useQuery({
    queryKey: ['trucks-by-transportista', transportistaId],
    queryFn: () =>
      readThroughList<Truck>({
        remote: () =>
          supabase
            .from('trucks')
            .select('*')
            .eq('transportista_id', transportistaId!)
            .order('patente'),
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAllFromIndex('trucks', 'by_transportista', transportistaId!)
          return rows.sort((a, b) => a.patente.localeCompare(b.patente))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('trucks', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      }).then((rows) => rows.map(({ patente, tara }) => ({ patente, tara }))),
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
    mutationFn: (values: TruckInput) =>
      createRow<Truck, TruckInput & { id?: string }>({
        table: 'trucks',
        values,
        remote: (row) => supabase.from('trucks').insert(row).select().single()
      }),
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
    mutationFn: ({ id, values }: { id: string; values: TruckInput }) =>
      updateRow<Truck, TruckInput>({
        table: 'trucks',
        id,
        values,
        remote: () => supabase.from('trucks').update(values).eq('id', id).select().single()
      }),
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
    mutationFn: (id: string) =>
      deleteRow({
        table: 'trucks',
        id,
        remote: () => supabase.from('trucks').delete().eq('id', id)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks-admin'] })
      queryClient.invalidateQueries({ queryKey: ['trucks-by-transportista'] })
    }
  })
}
