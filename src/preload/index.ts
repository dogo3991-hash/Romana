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
  printTicketPdf: (weighingId: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('print-ticket-pdf', weighingId),
  printTicketDirect: (weighingId: string): Promise<void> =>
    ipcRenderer.invoke('print-ticket-direct', weighingId),
  notifyPrintReady: (): void => {
    ipcRenderer.send('ticket-print-ready')
  },
  openPath: (filePath: string): Promise<string> => ipcRenderer.invoke('open-path', filePath),
  cameraProcess: {
    start: (): Promise<{ started: boolean; error?: string }> =>
      ipcRenderer.invoke('camera-process:start'),
    stop: (): Promise<void> => ipcRenderer.invoke('camera-process:stop'),
    status: (): Promise<boolean> => ipcRenderer.invoke('camera-process:status')
  }
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
