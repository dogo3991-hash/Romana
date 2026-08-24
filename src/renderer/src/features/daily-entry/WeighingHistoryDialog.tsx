import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { useWeighingAudit } from './useWeighingAudit'

interface WeighingHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weighingId: string | null
  transportistaNameById: Map<string, string | undefined>
}

const FIELD_LABELS: Record<string, string> = {
  hora_entrada: 'Hora Entrada',
  hora_salida: 'Hora Salida',
  transportista_id: 'Transportista',
  conductor: 'Conductor',
  patente: 'Patente',
  n_guia: 'N° Guía',
  producto: 'Producto',
  tara: 'Tara (kg)',
  peso_bruto: 'Peso Bruto (kg)',
  carga: 'Peso Neto (kg)',
  traslado: 'Traslado'
}

// Campos de control que no aportan al diff (ya se muestran en el encabezado
// de cada entrada, o nunca los toca el formulario de edición).
const HIDDEN_FIELDS = new Set([
  'id',
  'company_id',
  'operator_id',
  'created_at',
  'updated_at',
  'updated_by',
  'fecha',
  'ticket_number'
])

export function WeighingHistoryDialog({
  open,
  onOpenChange,
  weighingId,
  transportistaNameById
}: WeighingHistoryDialogProps): React.JSX.Element {
  const { data: entries, isLoading } = useWeighingAudit(weighingId)

  function formatValue(field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—'
    if (field === 'transportista_id') {
      return transportistaNameById.get(String(value)) ?? String(value)
    }
    if (typeof value === 'number') return value.toLocaleString('es-CL')
    return String(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de ediciones</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted">Cargando...</p>}

        {!isLoading && entries?.length === 0 && (
          <p className="text-sm text-muted">Este pesaje no tiene ediciones registradas.</p>
        )}

        <div className="flex flex-col gap-4">
          {entries?.map((entry) => {
            const changedFields = Object.keys(entry.new_data).filter(
              (field) => !HIDDEN_FIELDS.has(field) && entry.old_data[field] !== entry.new_data[field]
            )
            return (
              <div key={entry.id} className="rounded-lg border border-line p-3">
                <p className="text-sm font-medium text-ink">
                  {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm')} —{' '}
                  {entry.operators?.full_name ?? 'Operador desconocido'}
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                  {changedFields.length === 0 && <li>Sin cambios en los campos visibles.</li>}
                  {changedFields.map((field) => (
                    <li key={field}>
                      <span className="text-ink">{FIELD_LABELS[field] ?? field}</span>:{' '}
                      {formatValue(field, entry.old_data[field])} →{' '}
                      {formatValue(field, entry.new_data[field])}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
