import { app } from 'electron'
import { spawn, exec, type ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'

function cameraExePath(): string {
  return join(
    app.getPath('documents'),
    'SLM-Camara-Romana',
    'dist',
    'win-unpacked',
    'SLM-Camara-Romana.exe'
  )
}

let cameraProcess: ChildProcess | null = null

export function startCameraProcess(): { started: boolean; error?: string } {
  if (cameraProcess && !cameraProcess.killed) {
    return { started: true }
  }

  const exePath = cameraExePath()
  if (!existsSync(exePath)) {
    return {
      started: false,
      error: `No se encontró ${exePath}. Hay que generar el build de SLM-Camara-Romana (npm run build:unpack) primero.`
    }
  }

  // spawn() sin shell falla con "spawn UNKNOWN" para este ejecutable en Windows
  // (problema conocido de Node en algunos .exe firmados) — con shell:true funciona.
  const child = spawn(`"${exePath}"`, [], { detached: false, shell: true })
  child.on('exit', () => {
    if (cameraProcess === child) cameraProcess = null
  })
  cameraProcess = child
  return { started: true }
}

export function stopCameraProcess(): Promise<void> {
  return new Promise((resolve) => {
    if (!cameraProcess || cameraProcess.killed || !cameraProcess.pid) {
      cameraProcess = null
      resolve()
      return
    }
    const pid = cameraProcess.pid
    cameraProcess = null
    exec(`taskkill /pid ${pid} /t /f`, () => resolve())
  })
}

export function isCameraProcessRunning(): boolean {
  return cameraProcess !== null && !cameraProcess.killed
}

export function stopCameraProcessIfOwned(): void {
  if (cameraProcess && !cameraProcess.killed && cameraProcess.pid) {
    exec(`taskkill /pid ${cameraProcess.pid} /t /f`)
    cameraProcess = null
  }
}
