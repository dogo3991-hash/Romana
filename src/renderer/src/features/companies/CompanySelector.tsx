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

  if (loading) {
    return <div className="h-10 w-56 animate-pulse rounded-md bg-neutral-800" />
  }

  if (companies.length === 0) {
    return <span className="text-sm text-neutral-500">Sin empresas cargadas</span>
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
