import { useEffect } from 'react'
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
import {
  useConductorsByTransportista,
  useTransportistas
} from '@renderer/features/conductors/useConductorsAdmin'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { useTrucksByTransportista } from '@renderer/features/trucks/useTrucksAdmin'
import { useTraslados } from '@renderer/features/trucks/useTraslados'
import type { Database } from '@renderer/types/database.types'

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
    // 0 = todavía no se pesó (queda "en espera"); si se ingresa, tiene que ser > tara.
    peso_bruto: z.coerce.number().int('Debe ser un número entero').min(0),
    traslado: z.string().optional()
  })
  .refine((data) => data.peso_bruto === 0 || data.peso_bruto > data.tara, {
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
  // Conductores/patentes que ya están en la lista de espera — se ocultan al
  // agregar un pesaje nuevo para no crear un duplicado del mismo camión.
  pendingConductors: string[]
  pendingPatentes: string[]
}

function nowHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function emptyValues(): WeighingFormInput {
  return {
    hora: nowHHMM(),
    transportista_id: '',
    conductor: '',
    patente: '',
    n_guia: '',
    producto: '',
    tara: '',
    peso_bruto: '',
    traslado: ''
  }
}

export function WeighingForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  submitting,
  pendingConductors,
  pendingPatentes
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
    defaultValues: emptyValues()
  })

  // Solo re-sincroniza el formulario cuando el dialog se abre o cambia el registro
  // a editar — nunca en cada render, para no pisar lo que el usuario va tipeando.
  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        hora: editing.hora.slice(0, 5),
        transportista_id: editing.transportista_id ?? '',
        conductor: editing.conductor,
        patente: editing.patente,
        n_guia: editing.n_guia,
        producto: editing.producto ?? '',
        tara: editing.tara ?? '',
        peso_bruto: editing.peso_bruto ?? '',
        traslado: editing.traslado ?? ''
      })
    } else {
      reset(emptyValues())
    }
  }, [open, editing, reset])

  const { companyId } = useCompanyContext()
  const { data: transportistas } = useTransportistas()
  const transportistaId = watch('transportista_id')
  const { data: conductors } = useConductorsByTransportista(transportistaId || null)
  const { data: trucks } = useTrucksByTransportista(transportistaId || null)
  const { data: traslados } = useTraslados(companyId)

  // Al agregar un pesaje nuevo (no al editar uno existente) se ocultan los
  // conductores/patentes que ya están en la lista de espera, para no dejar
  // registrar dos veces el mismo camión antes de completar el primero.
  const conductorOptions = editing
    ? conductors
    : conductors?.filter((c) => !pendingConductors.includes(c.nombre))
  const patenteOptions = editing
    ? trucks
    : trucks?.filter((t) => !pendingPatentes.includes(t.patente))

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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {!editing
              ? 'Nuevo pesaje (en espera)'
              : editing.carga === null
                ? 'Completar pesaje'
                : 'Editar pesaje'}
          </DialogTitle>
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
                    {conductorOptions?.map((c) => (
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
                      <SelectValue
                        placeholder={
                          !transportistaId ? 'Elige un transportista primero' : 'Seleccionar'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {patenteOptions?.map((t) => (
                        <SelectItem key={t.patente} value={t.patente}>
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
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {traslados?.map((t) => (
                        <SelectItem key={t.id} value={t.nombre}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field
            label="Peso Bruto (kg)"
            error={errors.peso_bruto?.message}
            labelClassName="text-sm font-semibold text-primary"
          >
            <Input
              type="number"
              step="1"
              min="1"
              disabled={!editing}
              {...register('peso_bruto')}
              className="h-14 border-2 border-primary bg-primary/5 text-xl font-semibold text-ink disabled:bg-page disabled:text-muted"
            />
            {!editing && (
              <p className="text-xs text-muted">
                Se completa después, cuando el camión pase por la báscula.
              </p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tara (kg)" error={errors.tara?.message}>
              <Input type="number" {...register('tara')} disabled />
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
  labelClassName,
  children
}: {
  label: string
  error?: string
  labelClassName?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className={labelClassName}>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
