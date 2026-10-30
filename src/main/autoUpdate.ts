import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'
import { is } from '@electron-toolkit/utils'
import { logMainError } from './logger'

/**
 * Busca actualizaciones en el Release de GitHub configurado en electron-builder.yml,
 * las descarga solas en segundo plano, y pide confirmación antes de instalar —
 * igual que cualquier app comercial. En modo desarrollo no hace nada (no hay
 * app-update.yml hasta que se empaqueta).
 */
export function setupAutoUpdater(): void {
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Actualización disponible',
        message: 'Hay una actualización de SLM Bellavista Pesaje lista para instalar.',
        buttons: ['Reiniciar ahora', 'Más tarde'],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  autoUpdater.on('error', (err) => {
    logMainError('autoUpdater error', err)
  })

  autoUpdater.checkForUpdates().catch((err) => {
    logMainError('checkForUpdates falló', err)
  })
}
