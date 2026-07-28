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

interface PatenteTotals {
  viajes: number
  kg: number
}

function buildTransportistaSummary(
  rows: Weighing[],
  transportistaNameById: Map<string, string>
): Map<string, Map<string, PatenteTotals>> {
  const summary = new Map<string, Map<string, PatenteTotals>>()

  for (const w of rows) {
    const transportistaName = w.transportista_id
      ? (transportistaNameById.get(w.transportista_id) ?? 'Sin transportista')
      : 'Sin transportista'
    const patente = w.patente ?? 'Sin patente'

    if (!summary.has(transportistaName)) {
      summary.set(transportistaName, new Map())
    }
    const patentes = summary.get(transportistaName)!
    const totals = patentes.get(patente) ?? { viajes: 0, kg: 0 }
    totals.viajes += 1
    totals.kg += w.carga ?? 0
    patentes.set(patente, totals)
  }

  return new Map(
    [...summary.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([transportista, patentes]) => [
        transportista,
        new Map([...patentes.entries()].sort(([a], [b]) => a.localeCompare(b)))
      ])
  )
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

  const summary = buildTransportistaSummary(rows, transportistaNameById)

  // Columnas E–H: la tabla resumen se despliega a la derecha del detalle, no debajo de la columna A.
  const SUMMARY_COL_START = 5
  const SUMMARY_COL_END = 8

  let rowNum = (sheet.lastRow?.number ?? 1) + 2

  const titleRow = sheet.getRow(rowNum)
  titleRow.getCell(SUMMARY_COL_START).value = 'RESUMEN POR TRANSPORTISTA'
  sheet.mergeCells(rowNum, SUMMARY_COL_START, rowNum, SUMMARY_COL_END)
  titleRow.getCell(SUMMARY_COL_START).font = { bold: true, size: 12 }
  titleRow.getCell(SUMMARY_COL_START).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFBDD7EE' }
  }
  rowNum++

  const headerRow = sheet.getRow(rowNum)
  const headerLabels = ['Transportista', 'Patente', 'N° Viajes', 'Kg Totales']
  headerLabels.forEach((label, i) => {
    const cell = headerRow.getCell(SUMMARY_COL_START + i)
    cell.value = label
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }
  })
  rowNum++

  let totalViajes = 0
  let totalKg = 0

  for (const [transportista, patentes] of summary) {
    const transportistaViajes = [...patentes.values()].reduce((sum, p) => sum + p.viajes, 0)
    const transportistaKg = [...patentes.values()].reduce((sum, p) => sum + p.kg, 0)

    const transportistaRow = sheet.getRow(rowNum)
    ;[transportista, '', transportistaViajes, transportistaKg].forEach((value, i) => {
      const cell = transportistaRow.getCell(SUMMARY_COL_START + i)
      cell.value = value
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
    })
    transportistaRow.getCell(SUMMARY_COL_START + 3).numFmt = '#,##0'
    rowNum++

    for (const [patente, totals] of patentes) {
      const patenteRow = sheet.getRow(rowNum)
      ;['', patente, totals.viajes, totals.kg].forEach((value, i) => {
        patenteRow.getCell(SUMMARY_COL_START + i).value = value
      })
      patenteRow.getCell(SUMMARY_COL_START + 3).numFmt = '#,##0'
      rowNum++
    }

    totalViajes += transportistaViajes
    totalKg += transportistaKg
  }

  const totalRow = sheet.getRow(rowNum)
  ;['TOTAL GENERAL', '', totalViajes, totalKg].forEach((value, i) => {
    const cell = totalRow.getCell(SUMMARY_COL_START + i)
    cell.value = value
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } }
  })
  totalRow.getCell(SUMMARY_COL_START + 3).numFmt = '#,##0'

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
