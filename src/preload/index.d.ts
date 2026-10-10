import { ElectronAPI } from '@electron-toolkit/preload'

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
