import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { RefreshCw, Video, VideoOff, Loader2 } from 'lucide-react'
import { useAuth } from '@renderer/auth/AuthProvider'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { useCameraProcess } from '@renderer/features/camera/useCameraProcess'
import { SyncStatusIndicator } from '@renderer/components/SyncStatusIndicator'
import { drainQueue } from '@renderer/lib/syncEngine'
import logo from '@renderer/assets/logo.png'

const navItems = [
  { to: '/', label: 'Registro Diario' },
  { to: '/conductores', label: 'Conductores' },
  { to: '/camiones', label: 'Camiones' },
  { to: '/resumen-mensual', label: 'Resumen Mensual' },
  { to: '/historico', label: 'Carga Histórica' },
  { to: '/informes', label: 'Informes de Pesaje' },
  { to: '/acerca-de', label: 'Acerca de' }
]

export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { operator, signOut } = useAuth()
  const camera = useCameraProcess()

  useEffect(() => {
    void drainQueue()
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col bg-page text-ink">
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SLM Bellavista" className="h-8" />
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
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-ink'
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
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-ink'
                  )
                }
              >
                Administración
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <SyncStatusIndicator />
          <Button
            variant={camera.state === 'running' ? 'destructive' : 'outline'}
            size="sm"
            disabled={camera.state === 'starting'}
            className={
              camera.state === 'stopped'
                ? 'border-transparent bg-success text-white hover:bg-success/90'
                : undefined
            }
            title={
              camera.error ??
              (camera.state === 'running'
                ? 'Cierra SLM-Camara-Romana'
                : 'Abre SLM-Camara-Romana y activa la alerta/apertura automática')
            }
            onClick={() => (camera.state === 'running' ? camera.stop() : camera.start())}
          >
            {camera.state === 'starting' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando…
              </>
            )}
            {camera.state === 'running' && (
              <>
                <Video className="h-4 w-4" />
                Detener cámara
              </>
            )}
            {camera.state === 'stopped' && (
              <>
                <VideoOff className="h-4 w-4" />
                Activar cámara
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Actualizar"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted">{operator?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Cerrar sesión
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
