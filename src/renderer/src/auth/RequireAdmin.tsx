import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAdmin({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { operator } = useAuth()

  if (!operator?.is_admin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
