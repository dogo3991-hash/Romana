import { useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useConnectivity } from '@renderer/lib/connectivity'
import { drainQueue, getPendingSyncCount } from '@renderer/lib/syncEngine'

const RETRY_INTERVAL_MS = 30_000

export function SyncStatusIndicator(): React.JSX.Element | null {
  const connectivity = useConnectivity()
  const { data: pending = 0 } = useQuery({
    queryKey: ['offline-pending-count'],
    queryFn: getPendingSyncCount,
    refetchInterval: 3000
  })

  // Si un drenado falla estando online (sin pasar a offline), nada más lo
  // vuelve a disparar: los cambios quedarían pendientes hasta reiniciar la app.
  const hasPending = pending > 0
  useEffect(() => {
    if (connectivity !== 'online' || !hasPending) return
    const interval = setInterval(() => void drainQueue(), RETRY_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [connectivity, hasPending])

  if (connectivity === 'online' && pending === 0) return null

  return (
    <button
      onClick={() => void drainQueue()}
      title="Reintentar sincronización"
      className="flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs text-warning"
    >
      <WifiOff className="h-3.5 w-3.5" />
      {connectivity === 'offline' ? 'Sin conexión' : 'Sincronizando'}
      {pending > 0 && ` · ${pending} pendiente${pending === 1 ? '' : 's'}`}
    </button>
  )
}
