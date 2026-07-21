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

  // Mientras "companies" todavia no resolvio (carga inicial, o esperando el
  // fallback a IndexedDB si esta offline), confiamos en el id guardado en
  // localStorage en vez de caer a null -- así no se bloquea toda la app
  // durante ese instante. Una vez que companies resuelve, se valida/corrige.
  const companyId =
    companies === undefined
      ? storedCompanyId
      : companies.some((c) => c.id === storedCompanyId)
        ? storedCompanyId
        : (companies[0]?.id ?? null)

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
