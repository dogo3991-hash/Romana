import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveFile: (
    buffer: ArrayBuffer,
    defaultName: string,
    filterName: string,
    extensions: string[]
  ): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('save-file', { buffer, defaultName, filterName, extensions }),
  printTicket: (weighingId: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('print-ticket', weighingId),
  notifyPrintReady: (): void => {
    ipcRenderer.send('ticket-print-ready')
  },
  openPath: (filePath: string): Promise<string> => ipcRenderer.invoke('open-path', filePath)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
