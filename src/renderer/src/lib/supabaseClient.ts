import { createClient } from '@supabase/supabase-js'
import type { Database } from '@renderer/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el archivo .env')
}

const FETCH_TIMEOUT_MS = 15_000

// Sin esto, un pedido que nunca responde (ej. wifi caído a mitad de conexión)
// queda "pendiente" para siempre: nunca falla, entonces nunca dispara el
// aviso de error del MutationCache — el botón de guardar queda colgado.
function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal
  return fetch(input, { ...init, signal })
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout }
})
