import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import { useAllCompanies, useCreateCompany, useUpdateCompany } from './useCompaniesAdmin'
import { useAllOperators, useCreateOperator, useUpdateOperator } from './useOperatorsAdmin'
import { OperatorForm, type OperatorFormValues } from './OperatorForm'

export function AdminScreen(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-10 p-6">
      <CompaniesSection />
      <OperatorsSection />
    </div>
  )
}

function CompaniesSection(): React.JSX.Element {
  const { data: companies, isLoading } = useAllCompanies()
  const createMutation = useCreateCompany()
  const updateMutation = useUpdateCompany()
  const [newName, setNewName] = useState('')

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!newName.trim()) return
    await createMutation.mutateAsync(newName.trim())
    setNewName('')
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Empresas transportistas</h2>

      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          placeholder="Nombre de la empresa"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" disabled={createMutation.isPending}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted">
                  Cargando...
                </td>
              </tr>
            )}
            {companies?.map((c) => (
              <tr key={c.id} className="text-ink">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">
                  <Badge variant={c.active ? 'success' : 'muted'}>
                    {c.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateMutation.mutate({ id: c.id, values: { active: !c.active } })
                    }
                  >
                    {c.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function OperatorsSection(): React.JSX.Element {
  const { data: operators, isLoading } = useAllOperators()
  const createMutation = useCreateOperator()
  const updateMutation = useUpdateOperator()
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(values: OperatorFormValues): Promise<void> {
    setError(null)
    try {
      await createMutation.mutateAsync(values)
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el operador')
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Operadores</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo operador
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium">Estado</th>
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
            {operators?.map((o) => (
              <tr key={o.id} className="text-ink">
                <td className="px-4 py-2">{o.full_name}</td>
                <td className="px-4 py-2 text-muted">{o.email}</td>
                <td className="px-4 py-2">
                  <Badge variant={o.is_admin ? 'default' : 'muted'}>
                    {o.is_admin ? 'Administrador' : 'Operador'}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  <Badge variant={o.active ? 'success' : 'muted'}>
                    {o.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({ id: o.id, values: { is_admin: !o.is_admin } })
                      }
                    >
                      {o.is_admin ? 'Quitar admin' : 'Hacer admin'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({ id: o.id, values: { active: !o.active } })
                      }
                    >
                      {o.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OperatorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        submitting={createMutation.isPending}
      />
    </section>
  )
}
