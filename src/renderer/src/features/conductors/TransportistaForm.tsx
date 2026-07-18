import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import type { Database } from '@renderer/types/database.types'

type Transportista = Database['public']['Tables']['transportistas']['Row']

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  rut: z.string().min(1, 'Requerido')
})

export type TransportistaFormValues = z.infer<typeof schema>

interface TransportistaFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TransportistaFormValues) => Promise<void>
  editing: Transportista | null
  submitting: boolean
}

export function TransportistaForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  submitting
}: TransportistaFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TransportistaFormValues>({
    resolver: zodResolver(schema),
    values: editing ? { nombre: editing.nombre, rut: editing.rut } : { nombre: '', rut: '' }
  })

  async function submit(values: TransportistaFormValues): Promise<void> {
    await onSubmit(values)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar transportista' : 'Nuevo transportista'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nombre</Label>
            <Input {...register('nombre')} />
            {errors.nombre && <p className="text-xs text-red-400">{errors.nombre.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Rut</Label>
            <Input {...register('rut')} />
            {errors.rut && <p className="text-xs text-red-400">{errors.rut.message}</p>}
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
