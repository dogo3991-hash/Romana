import { useAuth } from '@renderer/auth/AuthProvider'
import { useCompanyContext } from './CompanyContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'

export function CompanySelector(): React.JSX.Element {
  const { companyId, setCompanyId, companies, loading } = useCompanyContext()
  const { operator } = useAuth()

  if (loading) {
    return <div className="h-10 w-56 animate-pulse rounded-md bg-line/40" />
  }

  if (companies.length === 0) {
    return <span className="text-sm text-muted">Sin empresas cargadas</span>
  }

  // El expectador queda restringido a una sola empresa (RLS ya solo le
  // devuelve esa fila) — se muestra fijo, sin dropdown para cambiarla.
  if (operator?.is_viewer) {
    const name = companies.find((c) => c.id === companyId)?.name ?? '—'
    return <span className="flex h-10 w-56 items-center text-sm text-ink">{name}</span>
  }

  return (
    <Select value={companyId ?? undefined} onValueChange={setCompanyId}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Seleccionar empresa" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
