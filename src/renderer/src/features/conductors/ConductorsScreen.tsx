import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  useAllConductors,
  useCreateConductor,
  useCreateTransportista,
  useDeleteConductor,
  useDeleteTransportista,
  useTransportistas,
  useUpdateConductor,
  useUpdateTransportista
} from './useConductorsAdmin'
import { TransportistaForm, type TransportistaFormValues } from './TransportistaForm'
import { ConductorForm, type ConductorFormValues } from './ConductorForm'
import type { Database } from '@renderer/types/database.types'

type Transportista = Database['public']['Tables']['transportistas']['Row']

export function ConductorsScreen(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-10 p-6">
      <TransportistasSection />
      <ConductorsSection />
    </div>
  )
}

function TransportistasSection(): React.JSX.Element {
  const { data: transportistas, isLoading } = useTransportistas()
  const createMutation = useCreateTransportista()
  const updateMutation = useUpdateTransportista()
  const deleteMutation = useDeleteTransportista()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transportista | null>(null)

  function openNew(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(t: Transportista): void {
    setEditing(t)
    setFormOpen(true)
  }

  async function handleSubmit(values: TransportistaFormValues): Promise<void> {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
    setFormOpen(false)
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('¿Eliminar este transportista? No se puede si tiene conductores asociados.'))
      return
    await deleteMutation.mutateAsync(id)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">Transportistas</h2>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Rut</th>
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
            {!isLoading && transportistas?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  Sin transportistas cargados
                </td>
              </tr>
            )}
            {transportistas?.map((t) => (
              <tr key={t.id} className="text-neutral-200">
                <td className="px-4 py-2">{t.nombre}</td>
                <td className="px-4 py-2 text-neutral-400">{t.rut}</td>
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

      <TransportistaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </section>
  )
}

function ConductorsSection(): React.JSX.Element {
  const { data: conductors, isLoading } = useAllConductors()
  const createMutation = useCreateConductor()
  const updateMutation = useUpdateConductor()
  const deleteMutation = useDeleteConductor()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<{
    id: string
    nombre: string
    rut: string
    transportista_id: string
  } | null>(null)

  function openNew(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(c: {
    id: string
    nombre: string
    rut: string
    transportista_id: string
  }): void {
    setEditing(c)
    setFormOpen(true)
  }

  async function handleSubmit(values: ConductorFormValues): Promise<void> {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
    setFormOpen(false)
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('¿Eliminar este conductor?')) return
    await deleteMutation.mutateAsync(id)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">Conductores</h2>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Rut</th>
              <th className="px-4 py-2 font-medium">Transportista</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && conductors?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  Sin conductores cargados
                </td>
              </tr>
            )}
            {conductors?.map((c) => (
              <tr key={c.id} className="text-neutral-200">
                <td className="px-4 py-2">{c.nombre}</td>
                <td className="px-4 py-2 text-neutral-400">{c.rut}</td>
                <td className="px-4 py-2">{c.transportistas?.nombre}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        openEdit({
                          id: c.id,
                          nombre: c.nombre,
                          rut: c.rut,
                          transportista_id: c.transportista_id
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConductorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </section>
  )
}
