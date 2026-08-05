import { SerialPort } from 'serialport'
import type { WebContents } from 'electron'

export type ScaleStatus = 'searching' | 'connected' | 'no-signal'
export interface ScaleWeightPayload {
  weightKg: number
  raw: string
}

// Trama confirmada contra la romana real (verificado con captura de bytes crudos):
// STX (0x02) + signo + 7 dígitos (peso*10) + 1 dígito de estado + 1 char de checksum
// (LRC/BCC, no decodificado — no hace falta para el peso) + ETX (0x03). Ej: bytes
// `02 2b 30 30 30 30 30 30 31 42 03` = "+00000001B" con la báscula en 0 kg. No usa
// CRLF como terminador (primer intento de esta función asumía CRLF por error).
const STX = '\x02'
const ETX = '\x03'
const FRAME_REGEX = /^([+-])(\d{7})(\d)(.)$/

// Config. serie confirmada en terreno para el visor de la romana.
const SCALE_SERIAL_OPTIONS = {
  baudRate: 9600,
  dataBits: 7 as const,
  parity: 'even' as const,
  stopBits: 1 as const,
  autoOpen: false
}

// 2 tramas seguidas (no 1) para no confundirse con otro dispositivo serie conectado a
// la vez, pero sin exigir tantas que el ruido de sincronización inicial haga descartar
// el puerto correcto por timeout antes de juntar suficientes tramas válidas.
const REQUIRED_CONSECUTIVE_MATCHES = 2
const PORT_TRY_TIMEOUT_MS = 3500
const WATCHDOG_MS = 3000
const RESCAN_DELAY_MS = 3000

function log(msg: string): void {
  console.log(`[scale] ${msg}`)
}

function parseFrame(frame: string): ScaleWeightPayload | null {
  const match = FRAME_REGEX.exec(frame)
  if (!match) return null
  const [, sign, digits] = match
  const magnitude = parseInt(digits, 10) / 10
  return { weightKg: sign === '-' ? -magnitude : magnitude, raw: frame }
}

// Acumula bytes crudos del puerto y separa tramas por ETX, descartando cualquier STX
// sobrante al inicio de cada una. Se usa `latin1` para que cada byte mapee 1:1 a un
// char code, sin reinterpretación multi-byte de UTF-8.
function attachFrameReader(port: SerialPort, onFrame: (frame: string) => void): void {
  let buffer = ''
  port.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('latin1')
    let etxIndex = buffer.indexOf(ETX)
    while (etxIndex !== -1) {
      let frame = buffer.slice(0, etxIndex)
      buffer = buffer.slice(etxIndex + 1)
      const stxIndex = frame.lastIndexOf(STX)
      if (stxIndex !== -1) frame = frame.slice(stxIndex + 1)
      onFrame(frame)
      etxIndex = buffer.indexOf(ETX)
    }
    // Evita que un flujo sin ETX (puerto equivocado) haga crecer el buffer sin límite.
    if (buffer.length > 512) buffer = buffer.slice(-512)
  })
}

interface Session {
  sender: WebContents
  stopped: boolean
  currentPort: SerialPort | null
  watchdogTimer: NodeJS.Timeout | null
  status: ScaleStatus
}

let session: Session | null = null

function send(s: Session, channel: 'scale:weight' | 'scale:status', payload: unknown): void {
  if (s.sender.isDestroyed()) return
  s.sender.send(channel, payload)
}

function setStatus(s: Session, status: ScaleStatus): void {
  if (s.status === status) return
  s.status = status
  send(s, 'scale:status', { status })
}

function clearWatchdog(s: Session): void {
  if (s.watchdogTimer) {
    clearTimeout(s.watchdogTimer)
    s.watchdogTimer = null
  }
}

function armWatchdog(s: Session): void {
  clearWatchdog(s)
  s.watchdogTimer = setTimeout(() => {
    if (s.stopped) return
    log('watchdog: silencio prolongado, no-signal')
    setStatus(s, 'no-signal')
  }, WATCHDOG_MS)
}

function closeCurrentPort(s: Session): void {
  clearWatchdog(s)
  const port = s.currentPort
  s.currentPort = null
  if (port && port.isOpen) {
    port.close(() => {
      // Nada que hacer: el cierre es best-effort, la sesión ya se está reiniciando o deteniendo.
    })
  }
}

// Intenta abrir un candidato y validar que emite tramas con el formato esperado.
// Requiere REQUIRED_CONSECUTIVE_MATCHES tramas válidas seguidas antes de aceptar el
// puerto (una sola no basta: podría ser coincidencia con otro dispositivo serie
// conectado). Una trama inválida en medio reinicia el conteo en vez de descartar el
// puerto de inmediato, para tolerar ruido de sincronización inicial típico al abrir.
// Cada trama válida (incluso antes de confirmar el puerto) se reenvía de inmediato vía
// onWeight, para que el usuario vea el peso moverse apenas hay algo respondiendo — y
// ese mismo callback sigue siendo el único lector una vez adoptado el puerto.
function tryOpenAndAdopt(
  path: string,
  onWeight: (payload: ScaleWeightPayload) => void
): Promise<SerialPort | null> {
  return new Promise((resolve) => {
    let settled = false
    let consecutiveMatches = 0

    const port = new SerialPort({ path, ...SCALE_SERIAL_OPTIONS })

    function finish(result: SerialPort | null): void {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      port.removeAllListeners('error')
      if (!result && port.isOpen) port.close()
      resolve(result)
    }

    const timeout = setTimeout(() => {
      log(
        `${path}: sin ${REQUIRED_CONSECUTIVE_MATCHES} tramas válidas seguidas en ${PORT_TRY_TIMEOUT_MS}ms, descartado`
      )
      finish(null)
    }, PORT_TRY_TIMEOUT_MS)

    port.open((err) => {
      if (err) {
        log(`${path}: error al abrir - ${err.message}`)
        finish(null)
      } else {
        log(`${path}: abierto, escuchando...`)
      }
    })

    port.on('error', (err) => {
      log(`${path}: error de puerto - ${err.message}`)
      finish(null)
    })

    attachFrameReader(port, (frame) => {
      const payload = parseFrame(frame)
      if (payload) {
        consecutiveMatches += 1
        onWeight(payload)
        if (!settled && consecutiveMatches >= REQUIRED_CONSECUTIVE_MATCHES) finish(port)
      } else {
        if (frame.length > 0)
          log(`${path}: trama no coincide con el formato esperado: ${JSON.stringify(frame)}`)
        consecutiveMatches = 0
      }
    })
  })
}

async function runScan(s: Session): Promise<void> {
  if (s.stopped) return
  setStatus(s, 'searching')

  let candidates: string[] = []
  try {
    candidates = (await SerialPort.list()).map((p) => p.path)
  } catch {
    candidates = []
  }
  log(`puertos encontrados: ${candidates.length ? candidates.join(', ') : '(ninguno)'}`)

  for (const path of candidates) {
    if (s.stopped) return
    log(`probando ${path}...`)
    const port = await tryOpenAndAdopt(path, (payload) => {
      send(s, 'scale:weight', payload)
      setStatus(s, 'connected')
      armWatchdog(s)
    })
    if (s.stopped) {
      if (port && port.isOpen) port.close()
      return
    }
    if (port) {
      log(`${path} adoptado como puerto de la báscula`)
      adoptPort(s, port)
      return
    }
  }

  if (s.stopped) return
  log('ningún puerto respondió con el formato esperado, no-signal')
  setStatus(s, 'no-signal')
  setTimeout(() => {
    if (!s.stopped) void runScan(s)
  }, RESCAN_DELAY_MS)
}

function adoptPort(s: Session, port: SerialPort): void {
  s.currentPort = port
  setStatus(s, 'connected')
  armWatchdog(s)

  // El lector de tramas ya quedó enganchado desde tryOpenAndAdopt y sigue mandando
  // scale:weight por cada trama válida — acá solo falta detectar que el puerto se cae.
  port.on('error', (err) => {
    log(`puerto adoptado: error - ${err.message}, reintentando escaneo`)
    restartScan(s)
  })
  port.on('close', () => {
    if (!s.stopped) {
      log('puerto adoptado se cerró inesperadamente, reintentando escaneo')
      restartScan(s)
    }
  })
}

function restartScan(s: Session): void {
  if (s.stopped) return
  closeCurrentPort(s)
  void runScan(s)
}

export function startScaleReading(sender: WebContents): { started: boolean; error?: string } {
  if (session && !session.stopped) {
    return { started: true }
  }
  session = {
    sender,
    stopped: false,
    currentPort: null,
    watchdogTimer: null,
    status: 'searching'
  }
  void runScan(session)
  return { started: true }
}

export function stopScaleReading(): void {
  if (!session) return
  session.stopped = true
  closeCurrentPort(session)
  session = null
}

export function isScaleReadingRunning(): boolean {
  return session !== null && !session.stopped
}
