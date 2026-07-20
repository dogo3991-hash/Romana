import { app } from 'electron'
import { spawn, exec, type ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'

// La ubicación real del .exe depende de cómo se instaló: el instalador NSIS lo deja
// en la carpeta estándar de instalación por usuario de Windows; en esta PC de
// desarrollo se prueba directo desde la carpeta de build sin instalar. Se prueban
// ambas rutas y se usa la primera que exista.
function cameraExeCandidates(): string[] {
  const candidates: string[] = []
  if (process.env.LOCALAPPDATA) {
    // El instalador NSIS usa el "name" de package.json (no el productName) como
    // nombre de carpeta: minúsculas y guiones, no "SLM Camara Romana". Verificado
    // instalando de verdad: %LOCALAPPDATA%\Programs\slm-camara-romana\...
    candidates.push(
      join(process.env.LOCALAPPDATA, 'Programs', 'slm-camara-romana', 'SLM-Camara-Romana.exe')
    )
  }
  candidates.push(
    join(
      app.getPath('documents'),
      'SLM-Camara-Romana',
      'dist',
      'win-unpacked',
      'SLM-Camara-Romana.exe'
    )
  )
  return candidates
}

function cameraExePath(): string | null {
  return cameraExeCandidates().find(existsSync) ?? null
}

let cameraProcess: ChildProcess | null = null

export function startCameraProcess(): { started: boolean; error?: string } {
  if (cameraProcess && !cameraProcess.killed) {
    return { started: true }
  }

  const exePath = cameraExePath()
  if (!exePath) {
    return {
      started: false,
      error: `No se encontró SLM-Camara-Romana.exe. Rutas probadas: ${cameraExeCandidates().join(' | ')}`
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
