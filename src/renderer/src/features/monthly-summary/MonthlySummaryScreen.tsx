import { useState } from 'react'
import { format } from 'date-fns'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { CompanySelector } from '@renderer/features/companies/CompanySelector'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import { useDailyBreakdown, useMonthTotal } from './useMonthlySummary'

export function MonthlySummaryScreen(): React.JSX.Element {
  const { companyId } = useCompanyContext()
  const [monthValue, setMonthValue] = useState(() => format(new Date(), 'yyyy-MM'))
  const [year, month] = monthValue.split('-').map(Number)

  const { data: days, isLoading } = useDailyBreakdown(companyId, year, month)
  const { data: monthTotal } = useMonthTotal(companyId, year, month)

  if (!companyId) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        Selecciona una empresa para comenzar
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Empresa</label>
          <CompanySelector />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Mes</label>
          <Input
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            className="w-44"
          />
        </div>
        {monthTotal && (
          <Badge variant={monthTotal.is_detailed ? 'success' : 'muted'}>
            {monthTotal.is_detailed ? 'Detallado' : 'Histórico'}
          </Badge>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 text-right font-medium">Movimientos</th>
              <th className="px-4 py-2 text-right font-medium">Carga total día (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && days?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted">
                  Sin pesajes detallados para este mes
                </td>
              </tr>
            )}
            {days?.map((d) => (
              <tr key={d.fecha} className="text-ink">
                <td className="px-4 py-2">{d.fecha}</td>
                <td className="px-4 py-2 text-right">{d.movimientos}</td>
                <td className="px-4 py-2 text-right">{d.carga_total?.toLocaleString('es-CL')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-surface font-semibold text-ink">
              <td className="px-4 py-2">TOTAL MES</td>
              <td className="px-4 py-2 text-right">{monthTotal?.movimientos ?? 0}</td>
              <td className="px-4 py-2 text-right">
                {(monthTotal?.carga_total ?? 0).toLocaleString('es-CL')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
