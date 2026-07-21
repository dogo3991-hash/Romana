import type { PostgrestError } from '@supabase/supabase-js'
import { getOfflineDb, type QueueOp, type QueueTable, type SyncQueueEntry } from './offlineDb'
import { reportSuccess, reportFailure, getConnectivityState } from './connectivity'
import { drainQueue } from './syncEngine'

type Row = { id: string }

// Un error de Postgrest (RLS, check constraint, unique violation, etc.) siempre
// trae un `code`. Su ausencia significa que el pedido nunca llegó a Postgrest:
// se agotó nuestro timeout de fetch, o la conexión falló directamente. Eso es
// lo único que tratamos como "sin conexión" — un error real del servidor no
// debe taparse cayendo a datos locales viejos.
function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true
  const code = (error as { code?: unknown }).code
  return !code
}

function networkError(err: unknown): PostgrestError {
  return {
    message: err instanceof Error ? err.message : 'Error de red',
    details: '',
    hint: '',
    code: '',
    name: 'NetworkError'
  } as PostgrestError
}

// Cuando falla de verdad la red, supabase-js no siempre devuelve un `error`
// dentro del resultado — a veces la promesa directamente rechaza (el fetch de
// nuestro timeout aborta, o el fetch nativo tira una excepción). Sin este
// wrapper, esa excepción se escapa antes de llegar a la lógica de fallback
// local/cola de abajo, y la escritura/lectura offline simplemente no pasa nada.
async function safeCall<T extends { error: PostgrestError | null }>(
  call: () => PromiseLike<T>
): Promise<T> {
  try {
    return await call()
  } catch (err) {
    return { data: null, error: networkError(err) } as unknown as T
  }
}

async function putLocal<T extends Row>(table: QueueTable, row: T): Promise<void> {
  const db = await getOfflineDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.put(table, row as any)
}

async function deleteLocal(table: QueueTable, id: string): Promise<void> {
  const db = await getOfflineDb()
  await db.delete(table, id)
}

async function getLocal<T extends Row>(table: QueueTable, id: string): Promise<T | null> {
  const db = await getOfflineDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (await db.get(table, id)) as any
  return (row as T) ?? null
}

async function mergeLocal<T extends Row>(
  table: QueueTable,
  id: string,
  values: Partial<T>
): Promise<T> {
  const existing = await getLocal<T>(table, id)
  const merged = { ...(existing ?? ({ id } as T)), ...values, updated_at: new Date().toISOString() }
  await putLocal(table, merged)
  return merged
}

async function enqueueOrMerge(entry: {
  table: QueueTable
  op: QueueOp
  rowId: string
  payload: Record<string, unknown> | null
}): Promise<void> {
  const db = await getOfflineDb()
  const tx = db.transaction('sync_queue', 'readwrite')
  const candidates = await tx.store.index('by_table_row').getAll([entry.table, entry.rowId])
  const existing = candidates[0]

  if (existing?.op === 'insert' && entry.op === 'update') {
    await tx.store.put({ ...existing, payload: { ...existing.payload, ...entry.payload } })
  } else if (existing?.op === 'insert' && entry.op === 'delete') {
    await tx.store.delete(existing.seq)
  } else if (existing?.op === 'update' && entry.op === 'update') {
    await tx.store.put({ ...existing, payload: { ...existing.payload, ...entry.payload } })
  } else if (existing?.op === 'update' && entry.op === 'delete') {
    await tx.store.put({ ...existing, op: 'delete', payload: null })
  } else if (existing) {
    await tx.store.put({ ...existing, op: entry.op, payload: entry.payload })
  } else {
    const newEntry: Omit<SyncQueueEntry, 'seq'> = {
      table: entry.table,
      op: entry.op,
      rowId: entry.rowId,
      payload: entry.payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null
    }
    await tx.store.add(newEntry as SyncQueueEntry)
  }
  await tx.done
}

// ---- LECTURAS ----

export async function readThroughList<T extends Row>(params: {
  remote: () => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
  readLocal: () => Promise<T[]>
  writeLocal: (rows: T[]) => Promise<void>
}): Promise<T[]> {
  if (getConnectivityState() === 'offline') return params.readLocal()
  const { data, error } = await safeCall(params.remote)
  if (!error && data) {
    reportSuccess()
    await params.writeLocal(data)
    return data
  }
  if (error && !isNetworkError(error)) throw error
  reportFailure()
  return params.readLocal()
}

export async function readThroughOne<T extends Row>(params: {
  remote: () => PromiseLike<{ data: T | null; error: PostgrestError | null }>
  readLocal: () => Promise<T | null>
  writeLocal: (row: T) => Promise<void>
}): Promise<T | null> {
  if (getConnectivityState() === 'offline') return params.readLocal()
  const { data, error } = await safeCall(params.remote)
  if (!error && data) {
    reportSuccess()
    await params.writeLocal(data)
    return data
  }
  if (error && !isNetworkError(error)) throw error
  reportFailure()
  return params.readLocal()
}

// ---- ESCRITURAS ----

export async function createRow<TRow extends Row, TInsert extends { id?: string }>(params: {
  table: QueueTable
  values: TInsert
  remote: (row: TInsert & { id: string }) => PromiseLike<{
    data: TRow | null
    error: PostgrestError | null
  }>
}): Promise<TRow> {
  const id = params.values.id ?? crypto.randomUUID()
  const values = { ...params.values, id }

  if (getConnectivityState() === 'offline') {
    const optimisticRow = values as unknown as TRow
    await putLocal(params.table, optimisticRow)
    await enqueueOrMerge({ table: params.table, op: 'insert', rowId: id, payload: values })
    return optimisticRow
  }

  const { data, error } = await safeCall(() => params.remote(values))
  if (!error && data) {
    reportSuccess()
    await putLocal(params.table, data)
    void drainQueue()
    return data
  }
  if (error && !isNetworkError(error)) throw error
  reportFailure()
  const optimisticRow = values as unknown as TRow
  await putLocal(params.table, optimisticRow)
  await enqueueOrMerge({ table: params.table, op: 'insert', rowId: id, payload: values })
  return optimisticRow
}

export async function updateRow<TRow extends Row, TUpdate extends object>(params: {
  table: QueueTable
  id: string
  values: TUpdate
  remote: () => PromiseLike<{ data: TRow | null; error: PostgrestError | null }>
}): Promise<TRow> {
  if (getConnectivityState() === 'offline') {
    const merged = await mergeLocal<TRow>(params.table, params.id, params.values as Partial<TRow>)
    await enqueueOrMerge({
      table: params.table,
      op: 'update',
      rowId: params.id,
      payload: params.values as Record<string, unknown>
    })
    return merged
  }

  const { data, error } = await safeCall(params.remote)
  if (!error && data) {
    reportSuccess()
    await putLocal(params.table, data)
    void drainQueue()
    return data
  }
  if (error && !isNetworkError(error)) throw error
  reportFailure()
  const merged = await mergeLocal<TRow>(params.table, params.id, params.values as Partial<TRow>)
  await enqueueOrMerge({
    table: params.table,
    op: 'update',
    rowId: params.id,
    payload: params.values as Record<string, unknown>
  })
  return merged
}

export async function deleteRow(params: {
  table: QueueTable
  id: string
  remote: () => PromiseLike<{ error: PostgrestError | null }>
}): Promise<void> {
  if (getConnectivityState() === 'offline') {
    await deleteLocal(params.table, params.id)
    await enqueueOrMerge({ table: params.table, op: 'delete', rowId: params.id, payload: null })
    return
  }

  const { error } = await safeCall(async () => ({
    data: null,
    error: (await params.remote()).error
  }))
  if (!error) {
    reportSuccess()
    await deleteLocal(params.table, params.id)
    void drainQueue()
    return
  }
  if (error && !isNetworkError(error)) throw error
  reportFailure()
  await deleteLocal(params.table, params.id)
  await enqueueOrMerge({ table: params.table, op: 'delete', rowId: params.id, payload: null })
}
