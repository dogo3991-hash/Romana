import { useEffect, useState } from 'react'
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
import { useLastGuia } from './useWeighings'
import { useScaleReading } from '@renderer/features/scale/useScaleReading'
import { subscribeToScaleWeight } from '@renderer/features/scale/scaleConnection'
import { cn } from '@renderer/lib/utils'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

const PRODUCTOS = ['Min. Bellavista Open 1', 'Min. Bellavista Open 2', 'Gravilla', 'Otro']

function nextGuia(last: string): string {
  const match = last.match(/^(.*?)(\d+)$/)
  if (!match) return ''
  const [, prefix, digits] = match
  const incremented = (BigInt(digits) + 1n).toString().padStart(digits.length, '0')
  return prefix + incremented
}

const schema = z
  .object({
    // Hora de entrada: cuando se registra el camión (etapa 1).
    hora_entrada: z.string().min(1, 'Requerido'),
    // Hora de salida: cuando se completa el peso bruto (etapa 2).
    hora_salida: z.string().optional(),
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
  .refine((data) => data.peso_bruto === 0 || !!data.hora_salida, {
    message: 'Requerido al completar el pesaje',
    path: ['hora_salida']
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
  // true = editar solo los datos de un pesaje "en espera" (corregir un error
  // de tipeo); mantiene peso_bruto/hora_salida bloqueados y no propone hora
  // de salida, para no invitar a completar el pesaje desde este modo.
  lockWeight?: boolean
}

function nowHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// Recuerda el último traslado elegido (por empresa) para que el próximo
// pesaje nuevo lo proponga por defecto y no haya que volver a seleccionarlo.
function getLastTraslado(companyId: string | null): string {
  if (!companyId) return ''
  try {
    return localStorage.getItem(`lastTraslado:${companyId}`) ?? ''
  } catch {
    return ''
  }
}

function setLastTraslado(companyId: string | null, traslado: string): void {
  if (!companyId || !traslado) return
  try {
    localStorage.setItem(`lastTraslado:${companyId}`, traslado)
  } catch {
    // localStorage no disponible — no es crítico, se pedirá de nuevo
  }
}

function emptyValues(): WeighingFormInput {
  return {
    hora_entrada: nowHHMM(),
    hora_salida: '',
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
  pendingPatentes,
  lockWeight = false
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

  const { companyId } = useCompanyContext()
  const { refetch: refetchLastGuia } = useLastGuia()

  const [autoWeighOn, setAutoWeighOn] = useState(false)
  const scale = useScaleReading()
  // Mientras no llega una lectura en vivo real (local o de otro PC vía Supabase, por
  // ejemplo si se cae el internet) el campo se habilita para ingresar el peso a mano,
  // sin tener que apagar "Pesar Automático" primero.
  const isLiveReading = autoWeighOn && scale.state === 'connected'

  function handleToggleAutoWeigh(): void {
    if (autoWeighOn) {
      setAutoWeighOn(false)
      scale.stop()
    } else {
      setAutoWeighOn(true)
      scale.start()
    }
  }

  // Mientras el pesaje automático está activo, cada lectura válida de la báscula
  // sobreescribe el campo del formulario — el valor que quede al apretar "Guardar" es
  // el que se captura (la romana oscila mientras el camión se asienta, es esperado).
  useEffect(() => {
    if (!autoWeighOn) return
    return subscribeToScaleWeight(({ weightKg }) => {
      setValue('peso_bruto', Math.round(weightKg), { shouldValidate: true })
    })
  }, [autoWeighOn, setValue])

  // Al cerrar el diálogo, deja de aplicar lecturas en vivo al formulario — el puerto
  // serie sigue abierto (lo maneja el proceso main de forma continua, no este botón).
  useEffect(() => {
    if (open) return
    setAutoWeighOn(false)
    scale.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Solo re-sincroniza el formulario cuando el dialog se abre o cambia el registro
  // a editar — nunca en cada render, para no pisar lo que el usuario va tipeando.
  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        hora_entrada: editing.hora_entrada.slice(0, 5),
        // Al completar un pesaje en espera todavía no tiene hora de salida
        // guardada — se propone la hora actual, editable.
        hora_salida:
          editing.hora_salida?.slice(0, 5) ??
          (editing.carga === null && !lockWeight ? nowHHMM() : ''),
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
      reset({ ...emptyValues(), traslado: getLastTraslado(companyId) })
      // Trae de Supabase (no de una caché local) el último N° Guía guardado
      // por cualquier PC, y propone el correlativo siguiente — el campo
      // sigue siendo editable por si no corresponde.
      refetchLastGuia().then(({ data }) => {
        if (data) setValue('n_guia', nextGuia(data))
      })
    }
  }, [open, editing, reset, setValue, refetchLastGuia, companyId, lockWeight])
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
    setLastTraslado(companyId, values.traslado ?? '')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {!editing
              ? 'Nuevo pesaje (en espera)'
              : lockWeight
                ? 'Editar datos (en espera)'
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
            <Field label="Hora Entrada" error={errors.hora_entrada?.message}>
              <Input type="time" {...register('hora_entrada')} />
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
            headerExtra={
              editing && !lockWeight ? (
                <Button
                  type="button"
                  variant={autoWeighOn ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleAutoWeigh}
                >
                  Pesar Automático
                </Button>
              ) : undefined
            }
          >
            <Input
              type="number"
              step="1"
              min="1"
              disabled={!editing || lockWeight || isLiveReading}
              {...register('peso_bruto')}
              className={cn(
                'h-14 border-2 border-primary bg-primary/5 text-xl font-semibold text-ink disabled:bg-page disabled:text-muted',
                // Mientras lee en vivo el campo queda deshabilitado pero sigue mostrando
                // datos activos — el gris y la opacidad reducida de "disabled" normal
                // (definidos en el Input base) lo dejan casi ilegible ahí.
                isLiveReading && 'disabled:text-ink disabled:opacity-100'
              )}
            />
            {autoWeighOn && (
              <p className="text-xs text-muted">
                {scale.state === 'searching' && 'Buscando báscula...'}
                {scale.state === 'connected' && 'Leyendo peso en vivo.'}
                {scale.state === 'no-signal' &&
                  'No se detecta peso, podés ingresar el peso manualmente.'}
              </p>
            )}
            {scale.error && <p className="text-xs text-danger">{scale.error}</p>}
            {(!editing || lockWeight) && !autoWeighOn && (
              <p className="text-xs text-muted">
                {lockWeight
                  ? 'Para registrar el peso, usa "Agregar peso bruto".'
                  : 'Se completa después, cuando el camión pase por la báscula.'}
              </p>
            )}
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Hora Salida" error={errors.hora_salida?.message}>
              <Input type="time" disabled={!editing || lockWeight} {...register('hora_salida')} />
            </Field>
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
  headerExtra,
  children
}: {
  label: string
  error?: string
  labelClassName?: string
  headerExtra?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className={labelClassName}>{label}</Label>
        {headerExtra}
      </div>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
