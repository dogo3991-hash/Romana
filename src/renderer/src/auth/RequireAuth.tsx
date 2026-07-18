import { useAuth } from './AuthProvider'
import { LoginScreen } from './LoginScreen'

export function RequireAuth({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { session, operator, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Cargando...
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  if (!operator || !operator.active) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-neutral-950 text-neutral-100">
        <p className="text-sm text-neutral-400">
          Tu usuario no tiene un perfil de operador activo. Contacta a un administrador.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
