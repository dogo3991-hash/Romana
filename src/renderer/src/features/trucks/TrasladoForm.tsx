import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import type { Database } from '@renderer/types/database.types'

type Traslado = Database['public']['Tables']['traslados']['Row']

const schema = z.object({
  nombre: z.string().min(1, 'Requerido')
})

export type TrasladoFormValues = z.infer<typeof schema>

interface TrasladoFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TrasladoFormValues) => Promise<void>
  editing: Traslado | null
  submitting: boolean
}

export function TrasladoForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  submitting
}: TrasladoFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TrasladoFormValues>({
    resolver: zodResolver(schema),
    values: editing ? { nombre: editing.nombre } : { nombre: '' }
  })

  async function submit(values: TrasladoFormValues): Promise<void> {
    await onSubmit(values)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar traslado' : 'Nuevo traslado'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nombre del lugar</Label>
            <Input {...register('nombre')} />
            {errors.nombre && <p className="text-xs text-danger">{errors.nombre.message}</p>}
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
