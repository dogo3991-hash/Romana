import { useSyncExternalStore } from 'react'

export interface CameraMessage {
  type?: string
  [key: string]: unknown
}

type MessageListener = (message: CameraMessage) => void

const WS_URL = 'ws://localhost:4545'
const RECONNECT_DELAY_MS = 5000

let socket: WebSocket | null = null
let connected = false
const connectionListeners = new Set<() => void>()
const messageListeners = new Set<MessageListener>()

function setConnected(value: boolean): void {
  if (connected === value) return
  connected = value
  for (const listener of connectionListeners) listener()
}

function connect(): void {
  if (socket) return
  socket = new WebSocket(WS_URL)

  socket.onopen = () => setConnected(true)

  socket.onmessage = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as CameraMessage
      for (const listener of messageListeners) listener(payload)
    } catch {
      // Mensaje malformado: se ignora.
    }
  }

  socket.onclose = () => {
    socket = null
    setConnected(false)
    setTimeout(connect, RECONNECT_DELAY_MS)
  }

  socket.onerror = () => {
    socket?.close()
  }
}

/**
 * Conexión WebSocket única y compartida a SLM-Camara-Romana (proyecto separado, ver
 * isolate-risky-features). Arranca apenas se carga el módulo y reintenta para siempre —
 * si ese proceso no está corriendo, simplemente no logra conectar y la app principal
 * sigue funcionando igual (la función es aditiva, nunca bloqueante).
 */
connect()

export function useCameraConnected(): boolean {
  return useSyncExternalStore(
    (listener) => {
      connectionListeners.add(listener)
      return () => connectionListeners.delete(listener)
    },
    () => connected
  )
}

export function subscribeToCameraMessages(handler: MessageListener): () => void {
  messageListeners.add(handler)
  return () => messageListeners.delete(handler)
}
