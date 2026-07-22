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

// La ventana de impresión de tickets (/ticket-print) es un proceso de renderer
// aparte que comparte el mismo localStorage (misma sesión) que la ventana
// principal, pero se abre y cierra constantemente durante el día. Si ambas
// ventanas refrescan el token en segundo plano, pueden chocar contra la misma
// rotación de refresh token y una de las dos cierra la sesión de la otra
// (ver supabase/auth-js#213). Solo la ventana principal debe encargarse del
// refresco proactivo.
const isTicketPrintWindow = window.location.hash.startsWith('#/ticket-print')

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
  auth: { autoRefreshToken: !isTicketPrintWindow }
})
