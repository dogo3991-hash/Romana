import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { CompanySelector } from '@renderer/features/companies/CompanySelector'
import { Button } from '@renderer/components/ui/button'
import { useAllTrucks, useCreateTruck, useDeleteTruck, useUpdateTruck } from './useTrucksAdmin'
import { TruckForm, type TruckFormValues } from './TruckForm'
import {
  useCreateTraslado,
  useDeleteTraslado,
  useTraslados,
  useUpdateTraslado
} from './useTraslados'
import { TrasladoForm, type TrasladoFormValues } from './TrasladoForm'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import type { Database } from '@renderer/types/database.types'

type Traslado = Database['public']['Tables']['traslados']['Row']
type Truck = Database['public']['Tables']['trucks']['Row']

export function TrucksScreen(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-10 p-6">
      <TrucksSection />
      <TrasladosSection />
    </div>
  )
}

function TrucksSection(): React.JSX.Element {
  const { data: trucks, isLoading } = useAllTrucks()
  const createMutation = useCreateTruck()
  const updateMutation = useUpdateTruck()
  const deleteMutation = useDeleteTruck()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Truck | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function openNew(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(t: Truck): void {
    setEditing(t)
    setFormOpen(true)
  }

  async function handleSubmit(values: TruckFormValues): Promise<void> {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
    setFormOpen(false)
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Camiones</h2>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Agregar camión
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Patente</th>
              <th className="px-4 py-2 text-right font-medium">Tara (kg)</th>
              <th className="px-4 py-2 font-medium">Transportista</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && trucks?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Sin camiones cargados
                </td>
              </tr>
            )}
            {trucks?.map((t) => (
              <tr key={t.id} className="text-ink">
                <td className="px-4 py-2">{t.patente}</td>
                <td className="px-4 py-2 text-right">{t.tara.toLocaleString('es-CL')}</td>
                <td className="px-4 py-2">
                  {t.transportistas?.nombre ?? <span className="text-danger">Sin asignar</span>}
                </td>
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

      <TruckForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        description="¿Eliminar este camión?"
        onConfirm={handleDelete}
        confirming={deleteMutation.isPending}
      />
    </section>
  )
}

function TrasladosSection(): React.JSX.Element {
  const { companyId } = useCompanyContext()
  const { data: traslados, isLoading } = useTraslados(companyId)
  const createMutation = useCreateTraslado(companyId)
  const updateMutation = useUpdateTraslado(companyId)
  const deleteMutation = useDeleteTraslado(companyId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Traslado | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function openNew(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(t: Traslado): void {
    setEditing(t)
    setFormOpen(true)
  }

  async function handleSubmit(values: TrasladoFormValues): Promise<void> {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, nombre: values.nombre })
    } else {
      await createMutation.mutateAsync(values.nombre)
    }
    setFormOpen(false)
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Traslados</h2>
        <Button onClick={openNew} disabled={!companyId}>
          <Plus className="h-4 w-4" />
          Agregar traslado
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted">Empresa</label>
        <CompanySelector />
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Lugar</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && traslados?.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted">
                  Sin lugares de traslado cargados
                </td>
              </tr>
            )}
            {traslados?.map((t) => (
              <tr key={t.id} className="text-ink">
                <td className="px-4 py-2">{t.nombre}</td>
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

      <TrasladoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        description="¿Eliminar este lugar de traslado?"
        onConfirm={handleDelete}
        confirming={deleteMutation.isPending}
      />
    </section>
  )
}
