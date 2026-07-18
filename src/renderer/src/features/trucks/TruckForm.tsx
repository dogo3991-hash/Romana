import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import type { Database } from '@renderer/types/database.types'

type Truck = Database['public']['Tables']['trucks']['Row']

const schema = z.object({
  patente: z.string().min(1, 'Requerido'),
  tara: z.coerce.number().int('Debe ser un número entero').positive('Debe ser mayor a 0')
})

export type TruckFormValues = z.output<typeof schema>
type TruckFormInput = z.input<typeof schema>

interface TruckFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TruckFormValues) => Promise<void>
  editing: Truck | null
  submitting: boolean
}

export function TruckForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  submitting
}: TruckFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TruckFormInput, unknown, TruckFormValues>({
    resolver: zodResolver(schema),
    values: editing ? { patente: editing.patente, tara: editing.tara } : { patente: '', tara: 0 }
  })

  async function submit(values: TruckFormValues): Promise<void> {
    await onSubmit(values)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar camión' : 'Nuevo camión'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Patente</Label>
            <Input {...register('patente')} />
            {errors.patente && <p className="text-xs text-red-400">{errors.patente.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tara (kg)</Label>
            <Input type="number" step="1" min="1" {...register('tara')} />
            {errors.tara && <p className="text-xs text-red-400">{errors.tara.message}</p>}
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
