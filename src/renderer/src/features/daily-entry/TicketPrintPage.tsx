import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@renderer/lib/supabaseClient'
import {
  useTransportistas,
  useConductorsByTransportista
} from '@renderer/features/conductors/useConductorsAdmin'
import { TicketDocument } from './TicketDocument'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useWeighingById(id: string | null) {
  return useQuery({
    queryKey: ['weighing-by-id', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('weighings').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function TicketPrintPage(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')

  const { data: weighing, isLoading, isError } = useWeighingById(id)
  const { data: transportistas } = useTransportistas()
  const { data: conductors } = useConductorsByTransportista(weighing?.transportista_id ?? null)

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
