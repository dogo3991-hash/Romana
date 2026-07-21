import { getOfflineDb, type SyncQueueEntry } from './offlineDb'
import { supabase } from '@renderer/lib/supabaseClient'
import { queryClient } from '@renderer/lib/queryClient'
import { notifyError } from '@renderer/components/ui/toast'

let draining = false

export async function drainQueue(): Promise<void> {
  if (draining) return
  draining = true
  try {
    const db = await getOfflineDb()
    for (;;) {
      const all = await db.getAll('sync_queue')
      const next = all.sort((a, b) => a.seq - b.seq)[0]
      if (!next) break
      try {
        await applyOne(next)
        await db.delete('sync_queue', next.seq)
      } catch (err) {
        await db.put('sync_queue', {
          ...next,
          attempts: next.attempts + 1,
          lastError: err instanceof Error ? err.message : 'Error desconocido'
        })
        notifyError('No se pudo sincronizar todo lo pendiente. Se reintentará automáticamente.')
        break
      }
    }
  } finally {
    draining = false
  }
}

async function applyOne(entry: SyncQueueEntry): Promise<void> {
  const db = await getOfflineDb()
  // Las llamadas a Supabase por nombre de tabla dinamico pierden la union de
  // tipos generada (cada tabla espera un shape de Insert/Update distinto);
  // ya se valido el shape correcto en el sitio donde se armo cada entrada de
  // la cola (los hooks tipados en useWeighings.ts, useTrucksAdmin.ts, etc.).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from(entry.table) as any
  if (entry.op === 'insert') {
    const { data, error } = await table.insert(entry.payload).select().single()
    if (error) throw error
    await db.put(entry.table, data)
  } else if (entry.op === 'update') {
    const { data, error } = await table
      .update(entry.payload)
      .eq('id', entry.rowId)
      .select()
      .single()
    if (error) throw error
    await db.put(entry.table, data)
  } else {
    const { error } = await supabase.from(entry.table).delete().eq('id', entry.rowId)
    if (error) throw error
    await db.delete(entry.table, entry.rowId)
  }

  queryClient.invalidateQueries({ queryKey: [entry.table] })
  if (entry.table === 'weighings') {
    queryClient.invalidateQueries({ queryKey: ['weighings'] })
    queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
    queryClient.invalidateQueries({ queryKey: ['monthly-summary-detailed'] })
    queryClient.invalidateQueries({ queryKey: ['weighing-by-id', entry.rowId] })
  } else if (entry.table === 'trucks') {
    queryClient.invalidateQueries({ queryKey: ['trucks-admin'] })
    queryClient.invalidateQueries({ queryKey: ['trucks-by-transportista'] })
  } else if (entry.table === 'conductors') {
    queryClient.invalidateQueries({ queryKey: ['conductors-admin'] })
    queryClient.invalidateQueries({ queryKey: ['conductors-by-transportista'] })
  } else if (entry.table === 'transportistas') {
    queryClient.invalidateQueries({ queryKey: ['transportistas'] })
    queryClient.invalidateQueries({ queryKey: ['conductors-admin'] })
  } else if (entry.table === 'traslados') {
    queryClient.invalidateQueries({ queryKey: ['traslados'] })
  } else if (entry.table === 'companies') {
    queryClient.invalidateQueries({ queryKey: ['companies'] })
    queryClient.invalidateQueries({ queryKey: ['companies-admin'] })
  }
}

export async function getPendingSyncCount(): Promise<number> {
  const db = await getOfflineDb()
  return db.count('sync_queue')
}
