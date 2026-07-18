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
  notifyPrintReady: () => void
  openPath: (filePath: string) => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
