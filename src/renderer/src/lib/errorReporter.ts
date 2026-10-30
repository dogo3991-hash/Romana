import { supabase } from '@renderer/lib/supabaseClient'

type ErrorReport = Parameters<Window['api']['logError']>[0]

// Un mismo error repetido (ej. un reintento en bucle) se sube una sola vez
// cada 10 minutos; el archivo local los guarda todos igual. El servidor tiene
// además su propio tope por usuario (migración 0026).
const DEDUPE_WINDOW_MS = 10 * 60_000
const lastSentAt = new Map<string, number>()

let appInfo: Promise<{ version: string; machine: string } | null> | null = null

function getAppInfo(): Promise<{ version: string; machine: string } | null> {
  appInfo ??= window.api.appInfo().catch(() => null)
  return appInfo
}

function toErrorReport(context: string, err: unknown): ErrorReport {
  if (err instanceof Error) return { context, message: err.message, stack: err.stack ?? null }
  // Los errores de Supabase son objetos planos con message, no instancias de Error.
  if (err && typeof err === 'object' && 'message' in err) {
    return { context, message: String((err as { message: unknown }).message), stack: null }
  }
  return { context, message: String(err), stack: null }
}

async function sendToSupabase(source: 'main' | 'renderer', report: ErrorReport): Promise<void> {
  const key = `${source}|${report.context}|${report.message}`
  const now = Date.now()
  if (now - (lastSentAt.get(key) ?? 0) < DEDUPE_WINDOW_MS) return
  lastSentAt.set(key, now)

  try {
    // Sin sesión no hay a nombre de quién guardarlo (RLS lo rechazaría):
    // queda solo en el archivo local.
    const { data } = await supabase.auth.getSession()
    if (!data.session) return

    const info = await getAppInfo()
    // Sin internet falla y se descarta: el archivo local ya lo tiene.
    await supabase.from('error_logs').insert({
      source,
      context: report.context.slice(0, 200),
      message: report.message.slice(0, 2000),
      stack: report.stack?.slice(0, 8000) ?? null,
      app_version: info?.version.slice(0, 50) ?? null,
      machine: info?.machine.slice(0, 100) ?? null
    })
  } catch {
    // Reportar un error nunca debe generar otro.
  }
}

/**
 * Registra un error en la consola, en el archivo de log local del PC y en la
 * tabla error_logs de Supabase. Usar en vez de console.error para errores que
 * valga la pena revisar después desde otro PC.
 */
export function reportError(context: string, err: unknown): void {
  console.error(`${context}:`, err)
  const report = toErrorReport(context, err)
  window.api?.logError(report)
  void sendToSupabase('renderer', report)
}

/** Captura los errores no atrapados del renderer y los del proceso main. */
export function startErrorReporting(): void {
  window.addEventListener('error', (event) => {
    reportError('error no atrapado', event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportError('promesa rechazada sin atrapar', event.reason)
  })
  // El main solo los manda a la ventana principal, así que no se duplican.
  window.api?.onMainError((report) => void sendToSupabase('main', report))
}
