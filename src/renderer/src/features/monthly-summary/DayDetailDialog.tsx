import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { DeleteWithPasswordDialog } from './DeleteWithPasswordDialog'
import { useTransportistas } from '@renderer/features/conductors/useConductorsAdmin'
import {
  useDailyWeighings,
  useUpdateWeighing,
  useDeleteWeighing
} from '@renderer/features/daily-entry/useWeighings'
import { WeighingForm, type WeighingFormValues } from '@renderer/features/daily-entry/WeighingForm'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

interface DayDetailDialogProps {
  companyId: string | null
  fecha: string | null
  onOpenChange: (open: boolean) => void
}

export function DayDetailDialog({
  companyId,
  fecha,
  onOpenChange
}: DayDetailDialogProps): React.JSX.Element {
  const [editing, setEditing] = useState<Weighing | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: weighings, isLoading } = useDailyWeighings(companyId, fecha ?? '')
  const { data: transportistas } = useTransportistas()
  const transportistaNameById = new Map(transportistas?.map((t) => [t.id, t.nombre]))

  const updateMutation = useUpdateWeighing(companyId, fecha ?? '')
  const deleteMutation = useDeleteWeighing(companyId, fecha ?? '')

  function openEdit(w: Weighing): void {
    setEditing(w)
    setFormOpen(true)
  }

  async function handleSubmit(values: WeighingFormValues): Promise<void> {
    if (!editing) return
    const carga = values.peso_bruto > 0 ? values.peso_bruto - values.tara : null
    await updateMutation.mutateAsync({
      id: editing.id,
      values: {
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
    })
    setFormOpen(false)
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget)
  }

  return (
    <>
      <Dialog open={fecha !== null} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Pesajes del {fecha}</DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[1000px] text-sm">
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
                {isLoading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-6 text-center text-muted">
                      Cargando...
                    </td>
                  </tr>
                )}
                {!isLoading && (weighings?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-6 text-center text-muted">
                      Sin pesajes para este día
                    </td>
                  </tr>
                )}
                {weighings?.map((w) => (
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
                    <td className="px-4 py-2 text-right">
                      {w.tara?.toLocaleString('es-CL') ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {w.peso_bruto?.toLocaleString('es-CL') ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {w.carga?.toLocaleString('es-CL') ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-muted">{w.traslado}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
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
        </DialogContent>
      </Dialog>

      <WeighingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={updateMutation.isPending}
        pendingConductors={[]}
        pendingPatentes={[]}
      />

      <DeleteWithPasswordDialog
        key={deleteTarget ?? 'none'}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
