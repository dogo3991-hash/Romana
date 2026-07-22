import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCompanyContext } from '@renderer/features/companies/CompanyContext'
import { useAllTrucks } from '@renderer/features/trucks/useTrucksAdmin'
import { useTransportistas } from '@renderer/features/conductors/useConductorsAdmin'
import { Badge } from '@renderer/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import {
  useTruckWeighings,
  useTrucksPeriodSummary,
  type TruckWeighingRecord
} from './useTruckHistory'

type Granularity = 'diario' | 'mensual' | 'anual'

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic'
]

interface Bucket {
  label: string
  viajes: number
  carga: number
}

function buildBuckets(
  records: TruckWeighingRecord[],
  granularity: Granularity,
  month: string,
  year: string
): Bucket[] {
  if (granularity === 'diario') {
    const [y, m] = month.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const viajes = new Array(daysInMonth).fill(0)
    const carga = new Array(daysInMonth).fill(0)
    for (const r of records) {
      const [ry, rm, rd] = r.fecha.split('-').map(Number)
      if (ry === y && rm === m) {
        viajes[rd - 1] += 1
        carga[rd - 1] += r.carga ?? 0
      }
    }
    return viajes.map((v, i) => ({ label: String(i + 1), viajes: v, carga: carga[i] }))
  }

  if (granularity === 'mensual') {
    const y = Number(year)
    const viajes = new Array(12).fill(0)
    const carga = new Array(12).fill(0)
    for (const r of records) {
      const [ry, rm] = r.fecha.split('-').map(Number)
      if (ry === y) {
        viajes[rm - 1] += 1
        carga[rm - 1] += r.carga ?? 0
      }
    }
    return viajes.map((v, i) => ({ label: MONTH_LABELS[i], viajes: v, carga: carga[i] }))
  }

  const byYear = new Map<number, { viajes: number; carga: number }>()
  for (const r of records) {
    const y = Number(r.fecha.split('-')[0])
    const entry = byYear.get(y) ?? { viajes: 0, carga: 0 }
    entry.viajes += 1
    entry.carga += r.carga ?? 0
    byYear.set(y, entry)
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([y, v]) => ({ label: String(y), viajes: v.viajes, carga: v.carga }))
}

function lastDayOfMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${monthStr}-${String(last).padStart(2, '0')}`
}

// La tabla por defecto (sin patente elegida) usa un período puntual acorde a la
// granularidad — un día, un mes o un año — a diferencia de los gráficos por camión
// (con patente elegida), que usan un período contenedor (mes con detalle por día,
// año con detalle por mes) para dibujar la tendencia.
function tablePeriodRange(
  granularity: Granularity,
  day: string,
  month: string,
  year: string
): { from: string; to: string } {
  if (granularity === 'diario') return { from: day, to: day }
  if (granularity === 'mensual') return { from: `${month}-01`, to: lastDayOfMonth(month) }
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

// Distintivo visual para identificar rápido de un vistazo a qué transportista
// pertenece cada patente en la tabla — el resto de transportistas queda sin marcar.
function transportistaBadge(
  nombre: string | undefined
): { label: string; variant: 'default' | 'success' } | null {
  if (!nombre) return null
  const normalized = nombre.trim().toLowerCase()
  if (normalized === 'transportes ramon araya') return { label: nombre, variant: 'default' }
  if (normalized === 'soc. transportes araya') return { label: nombre, variant: 'success' }
  return null
}

function TripsTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold text-ink">{payload[0].value} viajes</div>
      <div className="text-muted">{label}</div>
    </div>
  )
}

function CargaTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold text-ink">{payload[0].value.toLocaleString('es-CL')} kg</div>
      <div className="text-muted">{label}</div>
    </div>
  )
}

export function TruckHistorySection(): React.JSX.Element {
  const { companyId } = useCompanyContext()
  const { data: allTrucks } = useAllTrucks()
  const { data: transportistas } = useTransportistas()
  const transportistaNameById = useMemo(
    () => new Map(transportistas?.map((t) => [t.id, t.nombre])),
    [transportistas]
  )
  const [patente, setPatente] = useState<string | null>(null)
  const [granularity, setGranularity] = useState<Granularity>('diario')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [year, setYear] = useState(() => String(new Date().getFullYear()))
  const [tableDay, setTableDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [tableMonth, setTableMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [tableYear, setTableYear] = useState(() => String(new Date().getFullYear()))

  const trucks = allTrucks ?? []

  const { data: records, isLoading } = useTruckWeighings(companyId, patente)

  const tableRange = tablePeriodRange(granularity, tableDay, tableMonth, tableYear)
  const { data: periodSummary, isLoading: periodSummaryLoading } = useTrucksPeriodSummary(
    !patente ? companyId : null,
    tableRange.from,
    tableRange.to
  )

  const years = useMemo(() => {
    const set = new Set((records ?? []).map((r) => r.fecha.split('-')[0]))
    set.add(String(new Date().getFullYear()))
    return [...set].sort((a, b) => Number(b) - Number(a))
  }, [records])

  const tableYears = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => String(current - i))
  }, [])

  const buckets = useMemo(
    () => (records ? buildBuckets(records, granularity, month, year) : []),
    [records, granularity, month, year]
  )

  const totalViajes = records?.length ?? 0
  const totalCarga = useMemo(
    () => (records ?? []).reduce((sum, r) => sum + (r.carga ?? 0), 0),
    [records]
  )

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line p-5">
      <div>
        <h2 className="text-base font-semibold text-ink">Historial de Viajes por Camión</h2>
        <p className="text-sm text-muted">
          Elige una patente para ver su cantidad de viajes y carga total en el tiempo.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {patente && (
          <Button variant="outline" size="sm" onClick={() => setPatente(null)}>
            <ArrowLeft className="h-4 w-4" />
            Volver a la tabla
          </Button>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted">Patente</label>
          <Select value={patente ?? undefined} onValueChange={setPatente}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecciona una patente" />
            </SelectTrigger>
            <SelectContent>
              {trucks.map((t) => (
                <SelectItem key={t.id} value={t.patente}>
                  {t.patente}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted">Vista</label>
          <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diaria</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {patente && granularity === 'diario' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted">Mes</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40"
            />
          </div>
        )}

        {patente && granularity === 'mensual' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted">Año</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!patente && granularity === 'diario' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted">Día</label>
            <Input
              type="date"
              value={tableDay}
              onChange={(e) => setTableDay(e.target.value)}
              className="w-40"
            />
          </div>
        )}

        {!patente && granularity === 'mensual' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted">Mes</label>
            <Input
              type="month"
              value={tableMonth}
              onChange={(e) => setTableMonth(e.target.value)}
              className="w-40"
            />
          </div>
        )}

        {!patente && granularity === 'anual' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted">Año</label>
            <Select value={tableYear} onValueChange={setTableYear}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tableYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {patente && !isLoading && (
          <div className="text-sm text-muted">
            Total histórico: <span className="font-semibold text-ink">{totalViajes} viajes</span> ·{' '}
            <span className="font-semibold text-ink">{totalCarga.toLocaleString('es-CL')} kg</span>
          </div>
        )}
      </div>

      {!patente ? (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Patente</th>
                <th className="px-4 py-2 text-right font-medium">Movimientos</th>
                <th className="px-4 py-2 text-right font-medium">Peso (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {periodSummaryLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    Cargando…
                  </td>
                </tr>
              )}
              {!periodSummaryLoading && periodSummary?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    Ningún camión registró pesajes en este período
                  </td>
                </tr>
              )}
              {periodSummary?.map((row) => {
                const badge = transportistaBadge(
                  transportistaNameById.get(row.transportistaId ?? '')
                )
                return (
                  <tr
                    key={row.patente}
                    className="cursor-pointer text-ink hover:bg-page"
                    onClick={() => setPatente(row.patente)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {row.patente}
                        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">{row.movimientos}</td>
                    <td className="px-4 py-2 text-right">{row.peso.toLocaleString('es-CL')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted">Cargando…</div>
      ) : totalViajes === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted">
          Este camión no tiene viajes registrados
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted">Cantidad de viajes</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e1e0d9" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: '#c3c2b7' }}
                    tick={{ fill: '#898781', fontSize: 12 }}
                    interval={granularity === 'diario' ? 'preserveStartEnd' : 0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#898781', fontSize: 12 }}
                    width={32}
                  />
                  <Tooltip content={<TripsTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                  <Bar dataKey="viajes" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted">Carga total (kg)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e1e0d9" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: '#c3c2b7' }}
                    tick={{ fill: '#898781', fontSize: 12 }}
                    interval={granularity === 'diario' ? 'preserveStartEnd' : 0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#898781', fontSize: 12 }}
                    width={48}
                    tickFormatter={(v: number) => v.toLocaleString('es-CL')}
                  />
                  <Tooltip content={<CargaTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
                  <Bar dataKey="carga" fill="#008300" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
