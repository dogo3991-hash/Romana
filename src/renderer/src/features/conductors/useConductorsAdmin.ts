import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import { getOfflineDb } from '@renderer/lib/offlineDb'
import { readThroughList, createRow, updateRow, deleteRow } from '@renderer/lib/offlineRepo'
import type { Database } from '@renderer/types/database.types'

type Transportista = Database['public']['Tables']['transportistas']['Row']
type Conductor = Database['public']['Tables']['conductors']['Row']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTransportistas() {
  return useQuery({
    queryKey: ['transportistas'],
    queryFn: () =>
      readThroughList<Transportista>({
        remote: () => supabase.from('transportistas').select('*').order('nombre'),
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAll('transportistas')
          return rows.sort((a, b) => a.nombre.localeCompare(b.nombre))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('transportistas', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      })
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateTransportista() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { nombre: string; rut: string }) =>
      createRow<Transportista, { nombre: string; rut: string; id?: string }>({
        table: 'transportistas',
        values,
        remote: (row) => supabase.from('transportistas').insert(row).select().single()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportistas'] })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useUpdateTransportista() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: { nombre: string; rut: string } }) =>
      updateRow<Transportista, { nombre: string; rut: string }>({
        table: 'transportistas',
        id,
        values,
        remote: () => supabase.from('transportistas').update(values).eq('id', id).select().single()
      }),
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
    mutationFn: (id: string) =>
      deleteRow({
        table: 'transportistas',
        id,
        remote: () => supabase.from('transportistas').delete().eq('id', id)
      }),
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
      const conductors = await readThroughList<Conductor>({
        remote: async () => {
          const { data, error } = await supabase
            .from('conductors')
            .select('*, transportistas(nombre)')
            .order('nombre')
          return { data: data as Conductor[] | null, error }
        },
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAll('conductors')
          return rows.sort((a, b) => a.nombre.localeCompare(b.nombre))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('conductors', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      })
      const db = await getOfflineDb()
      const transportistas = await db.getAll('transportistas')
      const byId = new Map(transportistas.map((t) => [t.id, t]))
      return conductors.map((c) => ({
        ...c,
        transportistas: byId.get(c.transportista_id) ?? null
      })) as ConductorWithTransportista[]
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useConductorsByTransportista(transportistaId: string | null) {
  return useQuery({
    queryKey: ['conductors-by-transportista', transportistaId],
    queryFn: () =>
      readThroughList<Conductor>({
        remote: () =>
          supabase
            .from('conductors')
            .select('*')
            .eq('transportista_id', transportistaId!)
            .order('nombre'),
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAllFromIndex('conductors', 'by_transportista', transportistaId!)
          return rows.sort((a, b) => a.nombre.localeCompare(b.nombre))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('conductors', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      }).then((rows) => rows.map(({ nombre, rut }) => ({ nombre, rut }))),
    enabled: !!transportistaId
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCreateConductor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { nombre: string; rut: string; transportista_id: string }) =>
      createRow<Conductor, { nombre: string; rut: string; transportista_id: string; id?: string }>({
        table: 'conductors',
        values,
        remote: (row) => supabase.from('conductors').insert(row).select().single()
      }),
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
    mutationFn: ({
      id,
      values
    }: {
      id: string
      values: { nombre: string; rut: string; transportista_id: string }
    }) =>
      updateRow<Conductor, { nombre: string; rut: string; transportista_id: string }>({
        table: 'conductors',
        id,
        values,
        remote: () => supabase.from('conductors').update(values).eq('id', id).select().single()
      }),
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
    mutationFn: (id: string) =>
      deleteRow({
        table: 'conductors',
        id,
        remote: () => supabase.from('conductors').delete().eq('id', id)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductors-admin'] })
      queryClient.invalidateQueries({ queryKey: ['conductors-by-transportista'] })
    }
  })
}
