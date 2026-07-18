import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import {
  useTransportistas,
  useConductorsByTransportista
} from '@renderer/features/conductors/useConductorsAdmin'
import { TicketDocument } from './TicketDocument'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

interface WeighingTicketProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weighing: Weighing | null
}

export function WeighingTicket({
  open,
  onOpenChange,
  weighing
}: WeighingTicketProps): React.JSX.Element {
  const { data: transportistas } = useTransportistas()
  const { data: conductors } = useConductorsByTransportista(weighing?.transportista_id ?? null)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!weighing) return <></>

  const transportista = transportistas?.find((t) => t.id === weighing.transportista_id)
  const conductorRut = conductors?.find((c) => c.nombre === weighing.conductor)?.rut

  async function handlePrint(): Promise<void> {
    if (!weighing) return
    setError(null)
    setPrinting(true)
    try {
      const pdfBuffer = await window.api.printTicket(weighing.id)
      const result = await window.api.saveFile(
        pdfBuffer,
        `Ticket-${weighing.ticket_number}.pdf`,
        'PDF',
        ['pdf']
      )
      if (!result.canceled && result.filePath) {
        await window.api.openPath(result.filePath)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el ticket')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ticket de Pesaje</DialogTitle>
        </DialogHeader>

        <TicketDocument
          weighing={weighing}
          transportista={transportista}
          conductorRut={conductorRut}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handlePrint} disabled={printing}>
            {printing ? 'Generando...' : 'Imprimir / Guardar como PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
