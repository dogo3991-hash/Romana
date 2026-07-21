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
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!weighing) return <></>

  const transportista = transportistas?.find((t) => t.id === weighing.transportista_id)
  const conductorRut = conductors?.find((c) => c.nombre === weighing.conductor)?.rut

  async function handleSavePdf(): Promise<void> {
    if (!weighing) return
    setError(null)
    setSaving(true)
    try {
      const pdfBuffer = await window.api.printTicketPdf(weighing.id)
      const fileName =
        weighing.ticket_number != null
          ? `Ticket-${weighing.ticket_number}.pdf`
          : `Ticket-provisorio-${weighing.id.slice(0, 8)}.pdf`
      const result = await window.api.saveFile(pdfBuffer, fileName, 'PDF', ['pdf'])
      if (!result.canceled && result.filePath) {
        await window.api.openPath(result.filePath)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF')
    } finally {
      setSaving(false)
    }
  }

  async function handlePrint(): Promise<void> {
    if (!weighing) return
    setError(null)
    setPrinting(true)
    try {
      await window.api.printTicketDirect(weighing.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo imprimir el ticket')
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

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button variant="outline" onClick={handleSavePdf} disabled={saving}>
            {saving ? 'Generando...' : 'Guardar PDF'}
          </Button>
          <Button onClick={handlePrint} disabled={printing}>
            {printing ? 'Abriendo...' : 'Imprimir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
