import { useQuery } from '@tanstack/react-query'
import { supabase } from '@renderer/lib/supabaseClient'
import { getOfflineDb } from '@renderer/lib/offlineDb'
import { readThroughList } from '@renderer/lib/offlineRepo'
import type { Database } from '@renderer/types/database.types'

type Company = Database['public']['Tables']['companies']['Row']

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () =>
      readThroughList<Company>({
        remote: () => supabase.from('companies').select('*').eq('active', true).order('name'),
        readLocal: async () => {
          const db = await getOfflineDb()
          const rows = await db.getAll('companies')
          return rows.filter((c) => c.active).sort((a, b) => a.name.localeCompare(b.name))
        },
        writeLocal: async (rows) => {
          const db = await getOfflineDb()
          const tx = db.transaction('companies', 'readwrite')
          await Promise.all(rows.map((r) => tx.store.put(r)))
          await tx.done
        }
      })
  })
}
