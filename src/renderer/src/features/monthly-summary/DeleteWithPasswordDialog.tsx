import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { supabase } from '@renderer/lib/supabaseClient'
import { useAuth } from '@renderer/auth/AuthProvider'

interface DeleteWithPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function DeleteWithPasswordDialog({
  open,
  onOpenChange,
  onConfirm
}: DeleteWithPasswordDialogProps): React.JSX.Element {
  const { operator } = useAuth()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete(): Promise<void> {
    if (!operator?.email || !password) return
    setSubmitting(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: operator.email,
      password
    })

    if (authError) {
      setSubmitting(false)
      setError('Contraseña incorrecta')
      return
    }

    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      setError('No se pudo eliminar el pesaje, intentá de nuevo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted">
          Ingresá tu contraseña para eliminar este pesaje. Esta acción no se puede deshacer.
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              preserveCase
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
              className="pr-9"
              autoFocus
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!password || submitting}
            onClick={handleDelete}
          >
            {submitting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
