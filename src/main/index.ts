import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  startCameraProcess,
  stopCameraProcess,
  isCameraProcessRunning,
  stopCameraProcessIfOwned
} from './cameraProcess'
import { setupAutoUpdater } from './autoUpdate'

// Esta app corre empaquetada sin consola adjunta: si stdout/stderr queda como un pipe
// roto, cualquier console.log/error revienta el proceso principal con EPIPE (el error
// "A JavaScript error occurred in the main process" que se ve a veces). Ignorarlo acá
// evita que un log de rutina tire abajo toda la app.
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code !== 'EPIPE') throw err
})
process.stderr.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code !== 'EPIPE') throw err
})

// Permite que la alerta sonora de detección por cámara (Fase 4) suene sin requerir
// un gesto previo del usuario, ya que se dispara desde un evento de WebSocket, no un clic.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

interface SaveFileRequest {
  buffer: ArrayBuffer
  defaultName: string
  filterName: string
  extensions: string[]
}

async function handleSaveFile(
  _event: Electron.IpcMainInvokeEvent,
  { buffer, defaultName, filterName, extensions }: SaveFileRequest
): Promise<{ canceled: boolean; filePath?: string }> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: filterName, extensions }]
  })
  if (canceled || !filePath) return { canceled: true }
  await writeFile(filePath, Buffer.from(buffer))
  return { canceled: false, filePath }
}

function loadRendererRoute(window: BrowserWindow, hash: string): Promise<void> {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${hash}`)
  }
  return window.loadFile(join(__dirname, '../renderer/index.html'), { hash })
}

async function createReadyTicketPrintWindow(weighingId: string): Promise<BrowserWindow> {
  const printWindow = new BrowserWindow({
    show: false,
    width: 850,
    height: 1100,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  try {
    await new Promise<void>((resolve, reject) => {
      // Mas largo que el timeout de fetch del cliente de Supabase (15s): si la
      // conectividad recien se corto y todavia no se detecto, la primera
      // lectura offline puede tardar hasta ese tiempo en caer al dato local.
      const timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado')), 20000)
      ipcMain.once('ticket-print-ready', () => {
        clearTimeout(timeout)
        resolve()
      })
      loadRendererRoute(printWindow, `/ticket-print?id=${weighingId}`)
    })
  } catch (err) {
    // Si nunca llega a estar lista, la ventana oculta quedaba abierta para
    // siempre (proceso zombie) porque el finally del llamador nunca se
    // alcanza cuando esta funcion misma es la que lanza la excepcion.
    printWindow.destroy()
    throw err
  }

  return printWindow
}

async function handlePrintTicketPdf(
  _event: Electron.IpcMainInvokeEvent,
  weighingId: string
): Promise<ArrayBuffer> {
  const printWindow = await createReadyTicketPrintWindow(weighingId)
  try {
    const pdfBuffer = await printWindow.webContents.printToPDF({
      pageSize: 'Letter',
      printBackground: true,
      margins: { marginType: 'default' }
    })
    return new Uint8Array(pdfBuffer).buffer
  } finally {
    printWindow.destroy()
  }
}

async function handlePrintTicketDirect(
  _event: Electron.IpcMainInvokeEvent,
  weighingId: string
): Promise<void> {
  const printWindow = await createReadyTicketPrintWindow(weighingId)
  try {
    await new Promise<void>((resolve) => {
      printWindow.webContents.print({ printBackground: true }, () => resolve())
    })
  } finally {
    printWindow.destroy()
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'SLM Bellavista - Control de Pesaje',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.slmbellavista.pesaje')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.handle('save-file', handleSaveFile)
  ipcMain.handle('print-ticket-pdf', handlePrintTicketPdf)
  ipcMain.handle('print-ticket-direct', handlePrintTicketDirect)
  ipcMain.handle('open-path', (_event, filePath: string) => shell.openPath(filePath))
  ipcMain.handle('camera-process:start', () => startCameraProcess())
  ipcMain.handle('camera-process:stop', () => stopCameraProcess())
  ipcMain.handle('camera-process:status', () => isCameraProcessRunning())

  setupAutoUpdater()
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Si esta app abrió SLM-Camara-Romana, se cierra junto con ella.
  stopCameraProcessIfOwned()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
