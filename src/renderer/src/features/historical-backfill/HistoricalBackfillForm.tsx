import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { useHasDetailedData } from './useHistoricalTotals'
import type { Database } from '@renderer/types/database.types'

type HistoricalTotal = Database['public']['Tables']['historical_monthly_totals']['Row']

const currentYear = new Date().getFullYear()

const schema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(currentYear + 1),
  month: z.coerce.number().int().min(1).max(12),
  total_movements: z.coerce.number().int('Debe ser un número entero').min(0),
  total_carga: z.coerce.number().int('Debe ser un número entero').min(0),
  notes: z.string().optional()
})

export type HistoricalFormValues = z.output<typeof schema>
type HistoricalFormInput = z.input<typeof schema>

interface HistoricalBackfillFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: HistoricalFormValues) => Promise<void>
  editing: HistoricalTotal | null
  submitting: boolean
  companyId: string | null
}

export function HistoricalBackfillForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  submitting,
  companyId
}: HistoricalBackfillFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<HistoricalFormInput, unknown, HistoricalFormValues>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          year: editing.year,
          month: editing.month,
          total_movements: editing.total_movements,
          total_carga: editing.total_carga,
          notes: editing.notes ?? ''
        }
      : {
          year: currentYear,
          month: 1,
          total_movements: 0,
          total_carga: 0,
          notes: ''
        }
  })

  const year = Number(watch('year'))
  const month = Number(watch('month'))
  const { data: hasDetailedData } = useHasDetailedData(companyId, year, month)

  async function submit(values: HistoricalFormValues): Promise<void> {
    await onSubmit(values)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar total histórico' : 'Nuevo total histórico'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Año" error={errors.year?.message}>
              <Input type="number" {...register('year')} disabled={!!editing} />
            </Field>
            <Field label="Mes" error={errors.month?.message}>
              <Input type="number" min="1" max="12" {...register('month')} disabled={!!editing} />
            </Field>
          </div>

          {hasDetailedData && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
              Ya existe detalle diario cargado para este mes y empresa. El Resumen Mensual usará ese
              detalle, no este total.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Movimientos totales" error={errors.total_movements?.message}>
              <Input type="number" min="0" {...register('total_movements')} />
            </Field>
            <Field label="Carga total (kg)" error={errors.total_carga?.message}>
              <Input type="number" min="0" {...register('total_carga')} />
            </Field>
          </div>

          <Field label="Notas" error={errors.notes?.message}>
            <Input {...register('notes')} />
          </Field>

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
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
