import { ElectronAPI } from '@electron-toolkit/preload'

interface Api {
  saveFile: (
    buffer: ArrayBuffer,
    defaultName: string,
    filterName: string,
    extensions: string[]
  ) => Promise<{ canceled: boolean; filePath?: string }>
  printTicket: (weighingId: string) => Promise<ArrayBuffer>
  notifyPrintReady: () => void
  openPath: (filePath: string) => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
