import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { useTransportistas } from './useConductorsAdmin'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  rut: z.string().min(1, 'Requerido'),
  transportista_id: z.string().min(1, 'Requerido')
})

export type ConductorFormValues = z.infer<typeof schema>

interface ConductorFormEditing {
  nombre: string
  rut: string
  transportista_id: string
}

interface ConductorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ConductorFormValues) => Promise<void>
  editing: ConductorFormEditing | null
  submitting: boolean
}

export function ConductorForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  submitting
}: ConductorFormProps): React.JSX.Element {
  const { data: transportistas } = useTransportistas()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm<ConductorFormValues>({
    resolver: zodResolver(schema),
    values: editing ?? { nombre: '', rut: '', transportista_id: '' }
  })

  async function submit(values: ConductorFormValues): Promise<void> {
    await onSubmit(values)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar conductor' : 'Nuevo conductor'}</DialogTitle>
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

          <div className="flex flex-col gap-1.5">
            <Label>Transportista</Label>
            <Controller
              control={control}
              name="transportista_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportistas?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.transportista_id && (
              <p className="text-xs text-red-400">{errors.transportista_id.message}</p>
            )}
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
