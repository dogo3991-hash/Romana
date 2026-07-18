import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { CompanySelector } from '@renderer/features/companies/CompanySelector'
import { useAuth } from '@renderer/auth/AuthProvider'
import { Button } from '@renderer/components/ui/button'
import {
  useDeleteHistoricalTotal,
  useHistoricalTotals,
  useUpsertHistoricalTotal
} from './useHistoricalTotals'
import { HistoricalBackfillForm, type HistoricalFormValues } from './HistoricalBackfillForm'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import type { Database } from '@renderer/types/database.types'

type HistoricalTotal = Database['public']['Tables']['historical_monthly_totals']['Row']

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

export function HistoricalBackfillScreen(): React.JSX.Element {
  const { companyId } = useCompanyContext()
  const { operator } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<HistoricalTotal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: totals, isLoading } = useHistoricalTotals(companyId)
  const upsertMutation = useUpsertHistoricalTotal(companyId)
  const deleteMutation = useDeleteHistoricalTotal(companyId)

  function openNew(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(t: HistoricalTotal): void {
    setEditing(t)
    setFormOpen(true)
  }

  async function handleSubmit(values: HistoricalFormValues): Promise<void> {
    await upsertMutation.mutateAsync({
      company_id: companyId!,
      year: values.year,
      month: values.month,
      total_movements: values.total_movements,
      total_carga: values.total_carga,
      notes: values.notes || null,
      entered_by: operator!.id
    })
    setFormOpen(false)
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget)
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Empresa</label>
          <CompanySelector />
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Cargar total mensual
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Mes</th>
              <th className="px-4 py-2 text-right font-medium">Movimientos</th>
              <th className="px-4 py-2 text-right font-medium">Carga total (kg)</th>
              <th className="px-4 py-2 font-medium">Notas</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && totals?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Sin totales históricos cargados
                </td>
              </tr>
            )}
            {totals?.map((t) => (
              <tr key={t.id} className="text-ink">
                <td className="px-4 py-2">
                  {MONTH_NAMES[t.month - 1]} {t.year}
                </td>
                <td className="px-4 py-2 text-right">{t.total_movements}</td>
                <td className="px-4 py-2 text-right">{t.total_carga.toLocaleString('es-CL')}</td>
                <td className="px-4 py-2 text-muted">{t.notes}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <HistoricalBackfillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={upsertMutation.isPending}
        companyId={companyId}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        description="¿Eliminar este total histórico?"
        onConfirm={handleDelete}
        confirming={deleteMutation.isPending}
      />
    </div>
  )
}
