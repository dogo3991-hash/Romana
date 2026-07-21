import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Database } from '@renderer/types/database.types'

type WeighingRow = Database['public']['Tables']['weighings']['Row']
type TruckRow = Database['public']['Tables']['trucks']['Row']
type ConductorRow = Database['public']['Tables']['conductors']['Row']
type TransportistaRow = Database['public']['Tables']['transportistas']['Row']
type TrasladoRow = Database['public']['Tables']['traslados']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']
type OperatorRow = Database['public']['Tables']['operators']['Row']

export type QueueOp = 'insert' | 'update' | 'delete'
export type QueueTable =
  'weighings' | 'trucks' | 'conductors' | 'transportistas' | 'traslados' | 'companies'

export interface SyncQueueEntry {
  seq: number
  table: QueueTable
  op: QueueOp
  rowId: string
  payload: Record<string, unknown> | null
  createdAt: string
  attempts: number
  lastError: string | null
}

interface OfflineDBSchema extends DBSchema {
  weighings: {
    key: string
    value: WeighingRow
    indexes: { by_company_fecha: [string, string] }
  }
  trucks: { key: string; value: TruckRow; indexes: { by_transportista: string } }
  conductors: { key: string; value: ConductorRow; indexes: { by_transportista: string } }
  transportistas: { key: string; value: TransportistaRow }
  traslados: { key: string; value: TrasladoRow; indexes: { by_company: string } }
  companies: { key: string; value: CompanyRow }
  operators: { key: string; value: OperatorRow }
  sync_queue: {
    key: number
    value: SyncQueueEntry
    indexes: { by_table_row: [QueueTable, string] }
  }
}

const DB_NAME = 'slm-bellavista-offline'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null

export function getOfflineDb(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('weighings', { keyPath: 'id' }).createIndex('by_company_fecha', [
          'company_id',
          'fecha'
        ])
        db.createObjectStore('trucks', { keyPath: 'id' }).createIndex(
          'by_transportista',
          'transportista_id'
        )
        db.createObjectStore('conductors', { keyPath: 'id' }).createIndex(
          'by_transportista',
          'transportista_id'
        )
        db.createObjectStore('transportistas', { keyPath: 'id' })
        db.createObjectStore('traslados', { keyPath: 'id' }).createIndex('by_company', 'company_id')
        db.createObjectStore('companies', { keyPath: 'id' })
        db.createObjectStore('operators', { keyPath: 'id' })
        db.createObjectStore('sync_queue', { keyPath: 'seq', autoIncrement: true }).createIndex(
          'by_table_row',
          ['table', 'rowId']
        )
      }
    })
  }
  return dbPromise
}
