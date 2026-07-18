import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { CompanySelector } from '@renderer/features/companies/CompanySelector'
import { Button } from '@renderer/components/ui/button'
import { useCreateTruck, useDeleteTruck, useTrucks, useUpdateTruck } from './useTrucksAdmin'
import { TruckForm, type TruckFormValues } from './TruckForm'
import type { Database } from '@renderer/types/database.types'

type Truck = Database['public']['Tables']['trucks']['Row']

export function TrucksScreen(): React.JSX.Element {
  const { companyId } = useCompanyContext()
  const { data: trucks, isLoading } = useTrucks(companyId)
  const createMutation = useCreateTruck(companyId)
  const updateMutation = useUpdateTruck(companyId)
  const deleteMutation = useDeleteTruck(companyId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Truck | null>(null)

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

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('¿Eliminar este camión?')) return
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-300">Empresa</label>
          <CompanySelector />
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Agregar camión
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Patente</th>
              <th className="px-4 py-2 text-right font-medium">Tara (kg)</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && trucks?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  Sin camiones cargados
                </td>
              </tr>
            )}
            {trucks?.map((t) => (
              <tr key={t.id} className="text-neutral-200">
                <td className="px-4 py-2">{t.patente}</td>
                <td className="px-4 py-2 text-right">{t.tara.toLocaleString('es-CL')}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
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
    </div>
  )
}
