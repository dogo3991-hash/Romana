import { ElectronAPI } from '@electron-toolkit/preload'

// Igual a ErrorReport de src/main/logger.ts (este archivo lo usa el renderer,
// que no puede importar código del proceso main).
export interface ErrorReport {
  context: string
  message: string
  stack: string | null
}

interface Api {
  saveFile: (
    buffer: ArrayBuffer,
    defaultName: string,
    filterName: string,
    extensions: string[]
  ) => Promise<{ canceled: boolean; filePath?: string }>
  printTicketPdf: (weighingId: string) => Promise<ArrayBuffer>
  printTicketDirect: (weighingId: string) => Promise<void>
  // Impresión sin diálogo: 3 copias en blanco y negro en la impresora predeterminada.
  // deviceName null = la impresora predeterminada de Windows.
  printTicketAuto: (weighingId: string, deviceName: string | null) => Promise<void>
  listPrinters: () => Promise<{ name: string; displayName: string }[]>
  notifyPrintReady: () => void
  notifyPrintError: (message: string) => void
  openPath: (filePath: string) => Promise<string>
  appInfo: () => Promise<{ version: string; machine: string }>
  // Escribe el error en el archivo de log local (lo guarda el proceso main).
  logError: (report: ErrorReport) => void
  // Errores del proceso main, para subirlos a Supabase desde la ventana principal.
  onMainError: (callback: (report: ErrorReport) => void) => () => void
  cameraProcess: {
    start: () => Promise<{ started: boolean; error?: string }>
    stop: () => Promise<void>
    status: () => Promise<boolean>
  }
  scale: {
    onWeight: (callback: (payload: { weightKg: number; raw: string }) => void) => () => void
    onStatus: (
      callback: (payload: { status: 'searching' | 'connected' | 'no-signal' }) => void
    ) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
