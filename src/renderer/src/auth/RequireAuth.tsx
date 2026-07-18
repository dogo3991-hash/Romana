import { useAuth } from './AuthProvider'
import { LoginScreen } from './LoginScreen'

export function RequireAuth({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { session, operator, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-page text-muted">
        Cargando...
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  if (!operator || !operator.active) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-page text-ink">
        <p className="text-sm text-muted">
          Tu usuario no tiene un perfil de operador activo. Contacta a un administrador.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
