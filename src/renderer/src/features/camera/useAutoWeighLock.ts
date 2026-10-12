import { useEffect } from 'react'
import { useAuth } from '@renderer/auth/AuthProvider'
import {
  sendCameraMessage,
  subscribeToCameraMessages,
  useCameraConnected,
  type CameraMessage
} from './cameraConnection'
import { leaveLockChannel, releaseLock, requestLock, subscribeToLockState } from './autoWeighLock'

/**
 * Atiende el botón "Pesaje automático" de SLM-Camara-Romana: al activarlo, la cámara
 * pide el turno y este PC le responde si lo tiene o qué otro PC lo ocupa. Va en la
 * ventana principal con sesión iniciada (el canal del turno es privado).
 */
export function useAutoWeighLock(): void {
  const { operator } = useAuth()
  const isViewer = !!operator?.is_viewer
  const cameraConnected = useCameraConnected()

  useEffect(() => {
    const unsubscribeState = subscribeToLockState((state) => {
      if (state.status === 'granted') sendCameraMessage({ type: 'auto-weigh-granted' })
      else if (state.status === 'pending') sendCameraMessage({ type: 'auto-weigh-pending' })
      else if (state.status === 'denied') {
        sendCameraMessage({ type: 'auto-weigh-denied', holder: state.holder })
      }
    })
    const unsubscribeMessages = subscribeToCameraMessages((payload: CameraMessage) => {
      if (payload.type === 'auto-weigh-request' && typeof payload.host === 'string') {
        if (isViewer) {
          sendCameraMessage({
            type: 'auto-weigh-denied',
            reason: 'El operador de Pesos Bellavista es solo de consulta.'
          })
          return
        }
        requestLock(payload.host)
      } else if (payload.type === 'auto-weigh-release') {
        releaseLock()
      }
    })
    return () => {
      unsubscribeState()
      unsubscribeMessages()
    }
  }, [isViewer])

  // Si se cierra la app de la cámara, el turno queda libre para otro PC. Al
  // conectarse (o al iniciar sesión) se le pregunta si tiene el pesaje automático
  // activado, por si su pedido llegó antes de que esta pantalla estuviera lista.
  useEffect(() => {
    if (cameraConnected) sendCameraMessage({ type: 'auto-weigh-query' })
    else releaseLock()
  }, [cameraConnected])

  useEffect(() => () => leaveLockChannel(), [])
}
