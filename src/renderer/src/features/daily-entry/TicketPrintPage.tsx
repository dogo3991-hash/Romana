import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@renderer/lib/supabaseClient'
import { getOfflineDb } from '@renderer/lib/offlineDb'
import { TicketDocument } from './TicketDocument'
import type { Database } from '@renderer/types/database.types'

type Transportista = Database['public']['Tables']['transportistas']['Row']
type Conductor = Database['public']['Tables']['conductors']['Row']

// Esta pantalla se abre en una ventana de Electron aparte (proceso de renderer
// distinto), que arranca sin saber si la ventana principal ya detectó estar
// offline -- volver a intentar la red desde cero puede tardar hasta 15s por
// cada consulta, y encima esta pantalla las encadena (primero el pesaje,
// después el conductor). Como estos datos ya quedaron guardados localmente al
// crear/completar el pesaje, se lee directo de ahí primero y solo se intenta
// la red si falta algo (ej. reimprimir un ticket muy viejo en una PC nueva).

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useWeighingById(id: string | null) {
  return useQuery({
    queryKey: ['weighing-by-id', id],
    queryFn: async () => {
      const db = await getOfflineDb()
      const local = await db.get('weighings', id!)
      if (local) return local
      const { data, error } = await supabase.from('weighings').select('*').eq('id', id!).single()
      if (error) throw error
      await db.put('weighings', data)
      return data
    },
    enabled: !!id
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useTransportistasLocalFirst() {
  return useQuery({
    queryKey: ['transportistas-print'],
    queryFn: async () => {
      const db = await getOfflineDb()
      const local = await db.getAll('transportistas')
      if (local.length > 0) return local
      const { data, error } = await supabase.from('transportistas').select('*').order('nombre')
      if (error) throw error
      return data as Transportista[]
    }
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useConductorsByTransportistaLocalFirst(transportistaId: string | null) {
  return useQuery({
    queryKey: ['conductors-by-transportista-print', transportistaId],
    queryFn: async () => {
      const db = await getOfflineDb()
      const local = await db.getAllFromIndex('conductors', 'by_transportista', transportistaId!)
      if (local.length > 0) return local
      const { data, error } = await supabase
        .from('conductors')
        .select('*')
        .eq('transportista_id', transportistaId!)
        .order('nombre')
      if (error) throw error
      return data as Conductor[]
    },
    enabled: !!transportistaId
  })
}

export function TicketPrintPage(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')

  const { data: weighing, isLoading, isError } = useWeighingById(id)
  const { data: transportistas } = useTransportistasLocalFirst()
  const { data: conductors } = useConductorsByTransportistaLocalFirst(
    weighing?.transportista_id ?? null
  )

  const ready = !isLoading && (weighing === undefined || transportistas !== undefined)

  useEffect(() => {
    if (ready || isError) {
      window.api.notifyPrintReady()
    }
  }, [ready, isError])

  if (!weighing) {
    return <div className="bg-white p-5 text-xs text-ink">Cargando ticket...</div>
  }

  const transportista = transportistas?.find((t) => t.id === weighing.transportista_id)
  const conductorRut = conductors?.find((c) => c.nombre === weighing.conductor)?.rut

  return (
    <TicketDocument weighing={weighing} transportista={transportista} conductorRut={conductorRut} />
  )
}
