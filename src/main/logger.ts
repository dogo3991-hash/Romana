import log from 'electron-log/main'
import { ipcMain, type WebContents } from 'electron'

export interface ErrorReport {
  context: string
  message: string
  stack: string | null
}

// Ventana que sube los errores del proceso main a Supabase (la sesión de
// Supabase vive en el renderer). Solo la principal: si se mandaran a todas,
// las ventanas de impresión de tickets duplicarían cada registro.
let reportTarget: WebContents | null = null
// Errores ocurridos antes de que la ventana terminara de cargar (ej. el
// auto-update falla al arrancar): se mandan apenas cargue.
let pendingReports: ErrorReport[] = []

export function setErrorReportTarget(webContents: WebContents): void {
  reportTarget = webContents
  webContents.on('did-finish-load', () => {
    for (const report of pendingReports) webContents.send('main-error', report)
    pendingReports = []
  })
}

function toErrorReport(context: string, err: unknown): ErrorReport {
  if (err instanceof Error) return { context, message: err.message, stack: err.stack ?? null }
  return { context, message: String(err), stack: null }
}

/**
 * Archivo de log local en %APPDATA%\<app>\logs\main.log (al pasar 1 MB rota a
 * main.old.log). Todo console.* del proceso main queda ahí además de en la
 * terminal, y los errores del renderer llegan por 'log:error'.
 */
export function initLogging(): void {
  Object.assign(console, log.functions)

  ipcMain.on('log:error', (_event, report: ErrorReport) => {
    log.error(
      `[renderer] ${report.context}: ${report.message}${report.stack ? `\n${report.stack}` : ''}`
    )
  })
}

/** Registra un error del proceso main en el archivo y lo manda a Supabase. */
export function logMainError(context: string, err: unknown): void {
  log.error(`${context}:`, err)
  const report = toErrorReport(context, err)
  if (!reportTarget || reportTarget.isDestroyed()) return
  if (reportTarget.isLoading()) pendingReports.push(report)
  else reportTarget.send('main-error', report)
}
