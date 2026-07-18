import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'

const schema = z.object({
  full_name: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  is_admin: z.boolean()
})

export type OperatorFormValues = z.infer<typeof schema>

interface OperatorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: OperatorFormValues) => Promise<void>
  submitting: boolean
}

export function OperatorForm({
  open,
  onOpenChange,
  onSubmit,
  submitting
}: OperatorFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<OperatorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', is_admin: false }
  })

  async function submit(values: OperatorFormValues): Promise<void> {
    await onSubmit(values)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo operador</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nombre completo</Label>
            <Input {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Contraseña inicial</Label>
            <Input type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4" {...register('is_admin')} />
            Es administrador
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear operador'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
