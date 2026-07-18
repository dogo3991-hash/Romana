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
import { AutocompleteInput } from '@renderer/components/ui/autocomplete-input'
import {
  useConductorsByTransportista,
  useTransportistas
} from '@renderer/features/conductors/useConductorsAdmin'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { useTrucks } from '@renderer/features/trucks/useTrucksAdmin'
import type { Database } from '@renderer/types/database.types'
import type { EntrySuggestions } from './useEntrySuggestions'

type Weighing = Database['public']['Tables']['weighings']['Row']

const PRODUCTOS = ['Min. Bellavista Open 1', 'Min. Bellavista Open 2', 'Gravilla', 'Otro']

const schema = z
  .object({
    hora: z.string().min(1, 'Requerido'),
    transportista_id: z.string().min(1, 'Requerido'),
    conductor: z.string().min(1, 'Requerido'),
    patente: z.string().min(1, 'Requerido'),
    n_guia: z.string().min(1, 'Requerido'),
    producto: z.string().min(1, 'Requerido'),
    tara: z.coerce.number().int('Debe ser un número entero').positive('Debe ser mayor a 0'),
    peso_bruto: z.coerce.number().int('Debe ser un número entero').positive('Debe ser mayor a 0'),
    traslado: z.string().optional()
  })
  .refine((data) => data.peso_bruto > data.tara, {
    message: 'El peso bruto debe ser mayor que la tara',
    path: ['peso_bruto']
  })

export type WeighingFormValues = z.output<typeof schema>
type WeighingFormInput = z.input<typeof schema>

interface WeighingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WeighingFormValues) => Promise<void>
  editing: Weighing | null
  submitting: boolean
  suggestions: EntrySuggestions | undefined
}

function nowHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function WeighingForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  submitting,
  suggestions
}: WeighingFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors }
  } = useForm<WeighingFormInput, unknown, WeighingFormValues>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          hora: editing.hora.slice(0, 5),
          transportista_id: editing.transportista_id ?? '',
          conductor: editing.conductor,
          patente: editing.patente,
          n_guia: editing.n_guia,
          producto: editing.producto ?? '',
          tara: editing.tara ?? 0,
          peso_bruto: editing.peso_bruto ?? 0,
          traslado: editing.traslado ?? ''
        }
      : {
          hora: nowHHMM(),
          transportista_id: '',
          conductor: '',
          patente: '',
          n_guia: '',
          producto: '',
          tara: 0,
          peso_bruto: 0,
          traslado: ''
        }
  })

  const { companyId } = useCompanyContext()
  const { data: transportistas } = useTransportistas()
  const transportistaId = watch('transportista_id')
  const { data: conductors } = useConductorsByTransportista(transportistaId || null)
  const { data: trucks } = useTrucks(companyId)

  function handlePatenteChange(patente: string): void {
    setValue('patente', patente)
    const truck = trucks?.find((t) => t.patente === patente)
    if (truck) setValue('tara', truck.tara)
  }

  const pesoBruto = Number(watch('peso_bruto')) || 0
  const tara = Number(watch('tara')) || 0
  const neto = pesoBruto > 0 && tara > 0 && pesoBruto > tara ? pesoBruto - tara : null

  async function submit(values: WeighingFormValues): Promise<void> {
    await onSubmit(values)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar pesaje' : 'Nuevo pesaje'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Transportista" error={errors.transportista_id?.message}>
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
            </Field>
            <Field label="Hora" error={errors.hora?.message}>
              <Input type="time" {...register('hora')} />
            </Field>
          </div>

          <Field label="Conductor" error={errors.conductor?.message}>
            <Controller
              control={control}
              name="conductor"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !transportistaId ? 'Elige un transportista primero' : 'Seleccionar'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {conductors?.map((c) => (
                      <SelectItem key={c.nombre} value={c.nombre}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="N° Guía" error={errors.n_guia?.message}>
              <Input {...register('n_guia')} />
            </Field>
            <Field label="Producto" error={errors.producto?.message}>
              <Controller
                control={control}
                name="producto"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTOS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Patente" error={errors.patente?.message}>
              <Controller
                control={control}
                name="patente"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={handlePatenteChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks?.map((t) => (
                        <SelectItem key={t.id} value={t.patente}>
                          {t.patente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Traslado" error={errors.traslado?.message}>
              <Controller
                control={control}
                name="traslado"
                render={({ field }) => (
                  <AutocompleteInput
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    options={suggestions?.traslados ?? []}
                  />
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Tara (kg)" error={errors.tara?.message}>
              <Input type="number" {...register('tara')} disabled />
            </Field>
            <Field label="Peso Bruto (kg)" error={errors.peso_bruto?.message}>
              <Input type="number" step="1" min="1" {...register('peso_bruto')} />
            </Field>
            <Field label="Peso Neto (kg)">
              <Input value={neto !== null ? neto.toLocaleString('es-CL') : '—'} disabled />
            </Field>
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

function Field({
  label,
  error,
  children
}: {
  label: string
  error?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
