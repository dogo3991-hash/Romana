import { Workbook } from 'exceljs'
import type { Database } from '@renderer/types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']
type HistoricalTotal = Database['public']['Tables']['historical_monthly_totals']['Row']

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

async function saveWorkbook(workbook: Workbook, defaultName: string): Promise<boolean> {
  const buffer = await workbook.xlsx.writeBuffer()
  const result = await window.api.saveFile(buffer as ArrayBuffer, defaultName, 'Excel', ['xlsx'])
  return !result.canceled
}

export async function exportWeighingsReport(
  rows: Weighing[],
  companyName: string,
  from: string,
  to: string,
  transportistas: { id: string; nombre: string }[]
): Promise<boolean> {
  const transportistaNameById = new Map(transportistas.map((t) => [t.id, t.nombre]))

  const workbook = new Workbook()
  const sheet = workbook.addWorksheet('Detalle de Pesajes')

  sheet.columns = [
    { header: 'N° Ticket', key: 'ticket_number', width: 10 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Hora Entrada', key: 'hora_entrada', width: 12 },
    { header: 'Hora Salida', key: 'hora_salida', width: 12 },
    { header: 'Transportista', key: 'transportista', width: 24 },
    { header: 'Conductor', key: 'conductor', width: 24 },
    { header: 'Patente', key: 'patente', width: 12 },
    { header: 'N° Guía', key: 'n_guia', width: 12 },
    { header: 'Producto', key: 'producto', width: 18 },
    { header: 'Tara (kg)', key: 'tara', width: 12 },
    { header: 'Peso Bruto (kg)', key: 'peso_bruto', width: 16 },
    { header: 'Peso Neto (kg)', key: 'peso_neto', width: 16 },
    { header: 'Traslado', key: 'traslado', width: 20 }
  ]
  sheet.getRow(1).font = { bold: true }

  for (const w of rows) {
    sheet.addRow({
      ticket_number: w.ticket_number,
      fecha: w.fecha,
      hora_entrada: w.hora_entrada.slice(0, 5),
      hora_salida: w.hora_salida?.slice(0, 5) ?? '',
      transportista: w.transportista_id
        ? (transportistaNameById.get(w.transportista_id) ?? '')
        : '',
      conductor: w.conductor,
      patente: w.patente,
      n_guia: w.n_guia,
      producto: w.producto,
      tara: w.tara,
      peso_bruto: w.peso_bruto,
      peso_neto: w.carga,
      traslado: w.traslado
    })
  }

  const defaultName = `Pesajes ${companyName} ${from} a ${to}.xlsx`
  return saveWorkbook(workbook, defaultName)
}

export async function exportHistoricalReport(
  rows: HistoricalTotal[],
  companyName: string
): Promise<boolean> {
  const workbook = new Workbook()
  const sheet = workbook.addWorksheet('Histórico Mensual')

  sheet.columns = [
    { header: 'Año', key: 'year', width: 8 },
    { header: 'Mes', key: 'month', width: 14 },
    { header: 'Movimientos', key: 'total_movements', width: 14 },
    { header: 'Carga Total (kg)', key: 'total_carga', width: 16 },
    { header: 'Notas', key: 'notes', width: 30 }
  ]
  sheet.getRow(1).font = { bold: true }

  for (const r of rows) {
    sheet.addRow({
      year: r.year,
      month: MONTH_NAMES[r.month - 1],
      total_movements: r.total_movements,
      total_carga: r.total_carga,
      notes: r.notes
    })
  }

  const defaultName = `Historico ${companyName}.xlsx`
  return saveWorkbook(workbook, defaultName)
}
