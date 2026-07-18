import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { CompanySelector } from '@renderer/features/companies/CompanySelector'
import { useAuth } from '@renderer/auth/AuthProvider'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  useCreateWeighing,
  useDailySummary,
  useDailyWeighings,
  useDeleteWeighing,
  useMonthSummary,
  useUpdateWeighing
} from './useWeighings'
import { useEntrySuggestions } from './useEntrySuggestions'
import { WeighingForm, type WeighingFormValues } from './WeighingForm'
import { WeighingTicket } from './WeighingTicket'
import { useTransportistas } from '@renderer/features/conductors/useConductorsAdmin'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

export function DailyEntryScreen(): React.JSX.Element {
  const { companyId } = useCompanyContext()
  const { operator } = useAuth()
  const [fecha, setFecha] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Weighing | null>(null)
  const [ticketWeighing, setTicketWeighing] = useState<Weighing | null>(null)
  const [ticketOpen, setTicketOpen] = useState(false)

  const { data: weighings, isLoading } = useDailyWeighings(companyId, fecha)
  const { data: dailySummary } = useDailySummary(companyId, fecha)
  const [year, month] = fecha.split('-').map(Number)
  const { data: monthSummary } = useMonthSummary(companyId, year, month)
  const { data: suggestions } = useEntrySuggestions(companyId)
  const { data: transportistas } = useTransportistas()
  const transportistaNameById = new Map(transportistas?.map((t) => [t.id, t.nombre]))

  const createMutation = useCreateWeighing(companyId, fecha)
  const updateMutation = useUpdateWeighing(companyId, fecha)
  const deleteMutation = useDeleteWeighing(companyId, fecha)

  function openNew(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(w: Weighing): void {
    setEditing(w)
    setFormOpen(true)
  }

  async function handleSubmit(values: WeighingFormValues): Promise<void> {
    const carga = values.peso_bruto - values.tara

    if (editing) {
      await updateMutation.mutateAsync({
        id: editing.id,
        values: {
          hora: values.hora,
          transportista_id: values.transportista_id,
          conductor: values.conductor,
          patente: values.patente,
          n_guia: values.n_guia,
          producto: values.producto,
          tara: values.tara,
          peso_bruto: values.peso_bruto,
          carga,
          traslado: values.traslado || null
        }
      })
    } else {
      const created = await createMutation.mutateAsync({
        company_id: companyId!,
        operator_id: operator!.id,
        fecha,
        hora: values.hora,
        transportista_id: values.transportista_id,
        conductor: values.conductor,
        patente: values.patente,
        n_guia: values.n_guia,
        producto: values.producto,
        tara: values.tara,
        peso_bruto: values.peso_bruto,
        carga,
        traslado: values.traslado || null
      })
      setTicketWeighing(created)
      setTicketOpen(true)
    }
    setFormOpen(false)
  }

  function openTicket(w: Weighing): void {
    setTicketWeighing(w)
    setTicketOpen(true)
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('¿Eliminar este registro de pesaje?')) return
    await deleteMutation.mutateAsync(id)
  }

  if (!companyId) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        Selecciona una empresa para comenzar
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Empresa</label>
            <CompanySelector />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Fecha</label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-44"
            />
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Agregar pesaje
        </Button>
      </div>

      <div className="flex gap-4">
        <SummaryCard label="Movimientos del día" value={dailySummary?.movimientos ?? 0} />
        <SummaryCard
          label="Carga del día (kg)"
          value={(dailySummary?.carga_total ?? 0).toLocaleString('es-CL')}
        />
        <SummaryCard
          label="Acumulado del mes (kg)"
          value={(monthSummary?.carga_total ?? 0).toLocaleString('es-CL')}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Hora</th>
              <th className="px-4 py-2 font-medium">Transportista</th>
              <th className="px-4 py-2 font-medium">Conductor</th>
              <th className="px-4 py-2 font-medium">Patente</th>
              <th className="px-4 py-2 font-medium">N° Guía</th>
              <th className="px-4 py-2 font-medium">Producto</th>
              <th className="px-4 py-2 text-right font-medium">Tara (kg)</th>
              <th className="px-4 py-2 text-right font-medium">P. Bruto (kg)</th>
              <th className="px-4 py-2 text-right font-medium">P. Neto (kg)</th>
              <th className="px-4 py-2 font-medium">Traslado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-neutral-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && weighings?.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-neutral-500">
                  Sin pesajes registrados para este día
                </td>
              </tr>
            )}
            {weighings?.map((w) => (
              <tr key={w.id} className="text-neutral-200">
                <td className="px-4 py-2">{w.hora.slice(0, 5)}</td>
                <td className="px-4 py-2">
                  {w.transportista_id
                    ? (transportistaNameById.get(w.transportista_id) ?? '—')
                    : '—'}
                </td>
                <td className="px-4 py-2">{w.conductor}</td>
                <td className="px-4 py-2">{w.patente}</td>
                <td className="px-4 py-2">{w.n_guia}</td>
                <td className="px-4 py-2">{w.producto ?? '—'}</td>
                <td className="px-4 py-2 text-right">{w.tara?.toLocaleString('es-CL') ?? '—'}</td>
                <td className="px-4 py-2 text-right">
                  {w.peso_bruto?.toLocaleString('es-CL') ?? '—'}
                </td>
                <td className="px-4 py-2 text-right font-medium">
                  {w.carga.toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-2 text-neutral-400">{w.traslado}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openTicket(w)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <WeighingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        suggestions={suggestions}
      />

      <WeighingTicket open={ticketOpen} onOpenChange={setTicketOpen} weighing={ticketWeighing} />
    </div>
  )
}

function SummaryCard({
  label,
  value
}: {
  label: string
  value: string | number
}): React.JSX.Element {
  return (
    <div className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-xl font-semibold text-neutral-100">{value}</p>
    </div>
  )
}
