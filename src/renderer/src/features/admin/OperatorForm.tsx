import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { useAllCompanies } from './useCompaniesAdmin'

const schema = z
  .object({
    full_name: z.string().min(1, 'Requerido'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    role: z.enum(['operator', 'admin', 'viewer']),
    restricted_company_id: z.string().optional()
  })
  .refine((data) => data.role !== 'viewer' || !!data.restricted_company_id, {
    message: 'Selecciona la empresa a la que queda restringido',
    path: ['restricted_company_id']
  })

type OperatorFormInput = z.infer<typeof schema>

export interface OperatorFormValues {
  full_name: string
  email: string
  password: string
  is_admin: boolean
  is_viewer: boolean
  restricted_company_id: string | null
}

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
    watch,
    formState: { errors }
  } = useForm<OperatorFormInput>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', role: 'operator' }
  })

  const { data: companies } = useAllCompanies()
  const role = watch('role')

  async function submit(values: OperatorFormInput): Promise<void> {
    await onSubmit({
      full_name: values.full_name,
      email: values.email,
      password: values.password,
      is_admin: values.role === 'admin',
      is_viewer: values.role === 'viewer',
      restricted_company_id: values.role === 'viewer' ? (values.restricted_company_id ?? null) : null
    })
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

          <div className="flex flex-col gap-1.5">
            <Label>Rol</Label>
            <div className="flex flex-col gap-2 text-sm text-muted">
              <label className="flex items-center gap-2">
                <input type="radio" value="operator" {...register('role')} />
                Operador (registra y edita pesajes normalmente)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="admin" {...register('role')} />
                Administrador
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="viewer" {...register('role')} />
                Expectador (solo ver datos y descargar informes, sin editar)
              </label>
            </div>
          </div>

          {role === 'viewer' && (
            <div className="flex flex-col gap-1.5">
              <Label>Empresa a la que queda restringido</Label>
              <select
                className="h-10 rounded-md border border-line bg-surface px-3 text-sm"
                {...register('restricted_company_id')}
              >
                <option value="">Seleccionar</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.restricted_company_id && (
                <p className="text-xs text-danger">{errors.restricted_company_id.message}</p>
              )}
            </div>
          )}

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
