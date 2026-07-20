import { useState } from 'react'
import { format } from 'date-fns'
import { FileSpreadsheet } from 'lucide-react'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { CompanySelector } from '@renderer/features/companies/CompanySelector'
import { useHistoricalTotals } from '@renderer/features/historical-backfill/useHistoricalTotals'
import { useTransportistas } from '@renderer/features/conductors/useConductorsAdmin'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useWeighingsInRange } from './useReportsData'
import { exportHistoricalReport, exportWeighingsReport } from './exportExcel'
import { TruckHistorySection } from './TruckHistorySection'

export function ReportsScreen(): React.JSX.Element {
  const { companyId, companies } = useCompanyContext()
  const [from, setFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [exportingDetail, setExportingDetail] = useState(false)
  const [exportingHistorical, setExportingHistorical] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weighingsQuery = useWeighingsInRange(companyId, from, to)
  const { data: historicalTotals } = useHistoricalTotals(companyId)
  const { data: transportistas } = useTransportistas()
  const companyName = companies.find((c) => c.id === companyId)?.name ?? ''

  async function handleExportDetail(): Promise<void> {
    setError(null)
    setExportingDetail(true)
    try {
      const { data, error: queryError } = await weighingsQuery.refetch()
      if (queryError) throw queryError
      if (!data || data.length === 0) {
        setError('No hay pesajes registrados en ese rango de fechas.')
        return
      }
      await exportWeighingsReport(data, companyName, from, to, transportistas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el informe')
    } finally {
      setExportingDetail(false)
    }
  }

  async function handleExportHistorical(): Promise<void> {
    setError(null)
    setExportingHistorical(true)
    try {
      if (!historicalTotals || historicalTotals.length === 0) {
        setError('No hay totales históricos cargados para esta empresa.')
        return
      }
      await exportHistoricalReport(historicalTotals, companyName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el informe')
    } finally {
      setExportingHistorical(false)
    }
  }

  if (!companyId) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        Selecciona una empresa para comenzar
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted">Empresa</label>
        <CompanySelector />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="flex flex-col gap-4 rounded-lg border border-line p-5">
        <div>
          <h2 className="text-base font-semibold text-ink">Detalle de Pesajes</h2>
          <p className="text-sm text-muted">
            Una fila por viaje. Elige un mismo día para un reporte diario, o un rango más amplio
            para uno mensual.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted">Desde</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted">Hasta</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={handleExportDetail} disabled={exportingDetail}>
            <FileSpreadsheet className="h-4 w-4" />
            {exportingDetail ? 'Generando...' : 'Exportar a Excel'}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line p-5">
        <div>
          <h2 className="text-base font-semibold text-ink">Histórico Mensual</h2>
          <p className="text-sm text-muted">
            Totales mensuales cargados a mano en Carga Histórica.
          </p>
        </div>
        <Button onClick={handleExportHistorical} disabled={exportingHistorical}>
          <FileSpreadsheet className="h-4 w-4" />
          {exportingHistorical ? 'Generando...' : 'Exportar a Excel'}
        </Button>
      </section>

      <TruckHistorySection />
    </div>
  )
}
