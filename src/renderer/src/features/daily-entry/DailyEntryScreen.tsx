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
import { WeighingForm, type WeighingFormValues } from './WeighingForm'
import { WeighingTicket } from './WeighingTicket'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import { useTransportistas } from '@renderer/features/conductors/useConductorsAdmin'
import { useCameraAlerts } from '@renderer/features/camera/useCameraAlerts'
import { CameraPreview } from '@renderer/features/camera/CameraPreview'
import pesajeIcon from '@renderer/assets/pesaje-icon.png'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

export function DailyEntryScreen(): React.JSX.Element {
  const { companyId, loading: companyLoading } = useCompanyContext()
  const { operator } = useAuth()
  const [fecha, setFecha] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Weighing | null>(null)
  const [ticketWeighing, setTicketWeighing] = useState<Weighing | null>(null)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: weighings, isLoading } = useDailyWeighings(companyId, fecha)
  const { data: dailySummary } = useDailySummary(companyId, fecha)
  const [year, month] = fecha.split('-').map(Number)
  const { data: monthSummary } = useMonthSummary(companyId, year, month)
  const { data: transportistas } = useTransportistas()
  const transportistaNameById = new Map(transportistas?.map((t) => [t.id, t.nombre]))

  const pending = weighings?.filter((w) => w.carga === null) ?? []
  const completed = (weighings?.filter((w) => w.carga !== null) ?? []).slice().reverse()

  useCameraAlerts(pending, openEdit)

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
    // 0 = todavía no se pesó (el pesaje queda "en espera" hasta completar el peso bruto).
    const carga = values.peso_bruto > 0 ? values.peso_bruto - values.tara : null
    const payload = {
      hora_entrada: values.hora_entrada,
      hora_salida: values.hora_salida || null,
      transportista_id: values.transportista_id,
      conductor: values.conductor,
      patente: values.patente,
      n_guia: values.n_guia,
      producto: values.producto,
      tara: values.tara,
      peso_bruto: values.peso_bruto > 0 ? values.peso_bruto : null,
      carga,
      traslado: values.traslado || null
    }

    if (editing) {
      const wasPending = editing.carga === null
      const updated = await updateMutation.mutateAsync({ id: editing.id, values: payload })
      // Recién se abre el ticket automáticamente cuando este guardado es el que
      // completa un pesaje que estaba en espera — no en cada corrección.
      if (wasPending && carga !== null && updated) {
        setTicketWeighing(updated)
        setTicketOpen(true)
      }
    } else {
      await createMutation.mutateAsync({
        company_id: companyId!,
        operator_id: operator!.id,
        fecha,
        ...payload
      })
    }
    setFormOpen(false)
  }

  function openTicket(w: Weighing): void {
    setTicketWeighing(w)
    setTicketOpen(true)
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget)
  }

  if (companyLoading) {
    return <div className="flex h-full items-center justify-center text-muted">Cargando...</div>
  }

  if (!companyId) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        Selecciona una empresa para comenzar
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted">Empresa</label>
            <CompanySelector />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted">Fecha</label>
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

      <div className="flex items-start gap-4">
        {(isLoading || pending.length > 0) && (
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink">En Espera</h2>
            <div className="overflow-hidden rounded-lg border-2 border-warning/40">
              <table className="w-full text-sm">
                <thead className="bg-warning/10 text-left text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Hora Entrada</th>
                    <th className="px-4 py-2 font-medium">Transportista</th>
                    <th className="px-4 py-2 font-medium">Conductor</th>
                    <th className="px-4 py-2 font-medium">Patente</th>
                    <th className="px-4 py-2 font-medium">N° Guía</th>
                    <th className="px-4 py-2 font-medium">Producto</th>
                    <th className="px-4 py-2 font-medium">Traslado</th>
                    <th className="px-4 py-2 text-right font-medium">Tara (kg)</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {isLoading && (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-muted">
                        Cargando...
                      </td>
                    </tr>
                  )}
                  {pending.map((w) => (
                    <tr key={w.id} className="text-ink">
                      <td className="px-4 py-2">{w.hora_entrada.slice(0, 5)}</td>
                      <td className="px-4 py-2">
                        {w.transportista_id
                          ? (transportistaNameById.get(w.transportista_id) ?? '—')
                          : '—'}
                      </td>
                      <td className="px-4 py-2">{w.conductor}</td>
                      <td className="px-4 py-2">{w.patente}</td>
                      <td className="px-4 py-2">{w.n_guia}</td>
                      <td className="px-4 py-2">{w.producto ?? '—'}</td>
                      <td className="px-4 py-2 text-muted">{w.traslado}</td>
                      <td className="px-4 py-2 text-right">
                        {w.tara?.toLocaleString('es-CL') ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Agregar peso bruto"
                            onClick={() => openEdit(w)}
                          >
                            <img src={pesajeIcon} className="h-4 w-4" alt="Agregar peso bruto" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(w.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <CameraPreview />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-ink">Pesajes del Día</h2>
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Hora Entrada</th>
                <th className="px-4 py-2 font-medium">Hora Salida</th>
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
            <tbody className="divide-y divide-line">
              {!isLoading && completed.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-muted">
                    Sin pesajes completados para este día
                  </td>
                </tr>
              )}
              {completed.map((w) => (
                <tr key={w.id} className="text-ink">
                  <td className="px-4 py-2">{w.hora_entrada.slice(0, 5)}</td>
                  <td className="px-4 py-2">{w.hora_salida?.slice(0, 5) ?? '—'}</td>
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
                    {w.carga?.toLocaleString('es-CL') ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-muted">{w.traslado}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openTicket(w)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(w.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <WeighingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        pendingConductors={pending.map((w) => w.conductor)}
        pendingPatentes={pending.map((w) => w.patente)}
      />

      <WeighingTicket open={ticketOpen} onOpenChange={setTicketOpen} weighing={ticketWeighing} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        description="¿Eliminar este registro de pesaje?"
        onConfirm={handleDelete}
        confirming={deleteMutation.isPending}
      />
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
    <div className="flex-1 rounded-lg border border-line bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-semibold text-ink">{value}</p>
    </div>
  )
}
