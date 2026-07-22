import { format } from 'date-fns'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']
type Transportista = Database['public']['Tables']['transportistas']['Row']

interface TicketDocumentProps {
  weighing: Weighing
  transportista: Transportista | undefined
  conductorRut: string | undefined
}

export function TicketDocument({
  weighing,
  transportista,
  conductorRut
}: TicketDocumentProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 bg-white p-5 text-xs text-ink">
      <div className="border-b border-neutral-800 pb-2">
        <p className="text-sm font-bold">SLM BELLAVISTA</p>
        <p>RUT: 76.900.250-2</p>
        <p>RUTA C-327 KM 6</p>
      </div>

      <div className="border-2 border-blue-700 py-1 text-center font-bold">
        {weighing.ticket_number != null
          ? `TICKET DE PESAJE N° ${weighing.ticket_number}`
          : 'TICKET PROVISORIO — pendiente de sincronizar'}
      </div>
      {weighing.ticket_number == null && (
        <div className="border border-warning bg-warning/10 py-1 text-center text-[11px] font-semibold text-warning">
          Documento provisorio: el N° de Ticket definitivo se asignará al reconectar con el
          servidor.
        </div>
      )}
      <div className="border border-neutral-800 py-0.5 text-center font-semibold">
        Despacho de Carga
      </div>

      <div className="flex flex-col gap-1.5 border border-neutral-800 p-3">
        <div className="flex justify-between">
          <span>
            <span className="font-semibold underline">Patente</span> {weighing.patente}
          </span>
          <span className="text-[14.4px]">
            <span className="font-semibold underline">N° Guía de Despacho</span> {weighing.n_guia}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold underline">Cliente</span>
          <span>{weighing.traslado ?? '—'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold underline">Producto</span>
          <span>{weighing.producto ?? '—'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold underline">Transportista</span>
          <span>{transportista?.rut ?? '—'}</span>
          <span>{transportista?.nombre ?? '—'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold underline">Chofer</span>
          <span>{conductorRut ?? '—'}</span>
          <span>{weighing.conductor}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <span className="font-semibold underline">Fecha</span>
          <span>{format(new Date(`${weighing.fecha}T00:00:00`), 'dd-MM-yyyy')}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold underline">Hora Entrada</span>
          <span>{weighing.hora_entrada.slice(0, 5)}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold underline">Hora Salida</span>
          <span>{weighing.hora_salida?.slice(0, 5) ?? '—'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 border border-neutral-800 p-3">
        <div className="flex justify-between">
          <span>Peso Bruto</span>
          <span>{formatKg(weighing.peso_bruto)} kg</span>
        </div>
        <div className="flex justify-between">
          <span>Peso Tara</span>
          <span>{formatKg(weighing.tara)} kg</span>
        </div>
        <div className="flex justify-between text-[14.4px] font-bold">
          <span>Peso Neto</span>
          <span>{formatKg(weighing.carga)} kg</span>
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-muted">
        <span>SLM Bellavista</span>
        <span>Fecha Impresión: {format(new Date(), 'dd-MM-yyyy')}</span>
      </div>
    </div>
  )
}

function formatKg(value: number | null): string {
  return value !== null ? value.toLocaleString('es-CL') : '—'
}
