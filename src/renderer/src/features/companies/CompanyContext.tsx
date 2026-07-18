import { createContext, useContext, useState } from 'react'
import { useCompanies } from './useCompanies'

const STORAGE_KEY = 'slm-bellavista:selected-company-id'

interface CompanyContextValue {
  companyId: string | null
  setCompanyId: (id: string) => void
  companies: { id: string; name: string }[]
  loading: boolean
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { data: companies, isLoading } = useCompanies()
  const [storedCompanyId, setStoredCompanyId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY) || null
  )

  // Si la selección guardada ya no es válida (empresa desactivada/eliminada), cae a la primera disponible.
  const companyId =
    companies && companies.some((c) => c.id === storedCompanyId)
      ? storedCompanyId
      : (companies?.[0]?.id ?? null)

  function setCompanyId(id: string): void {
    localStorage.setItem(STORAGE_KEY, id)
    setStoredCompanyId(id)
  }

  return (
    <CompanyContext.Provider
      value={{ companyId, setCompanyId, companies: companies ?? [], loading: isLoading }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCompanyContext(): CompanyContextValue {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompanyContext debe usarse dentro de CompanyProvider')
  return ctx
}
