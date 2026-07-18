import { NavLink } from 'react-router-dom'
import { useAuth } from '@renderer/auth/AuthProvider'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import logo from '@renderer/assets/logo.png'

const navItems = [
  { to: '/', label: 'Registro Diario' },
  { to: '/conductores', label: 'Conductores' },
  { to: '/camiones', label: 'Camiones' },
  { to: '/resumen-mensual', label: 'Resumen Mensual' },
  { to: '/historico', label: 'Carga Histórica' },
  { to: '/informes', label: 'Informes de Pesaje' }
]

export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { operator, signOut } = useAuth()

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SLM Bellavista" className="h-8 invert" />
            <span className="text-sm font-medium tracking-tight">Control de Pesaje</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-neutral-800 text-neutral-100'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {operator?.is_admin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-neutral-800 text-neutral-100'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )
                }
              >
                Administración
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">{operator?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Cerrar sesión
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
