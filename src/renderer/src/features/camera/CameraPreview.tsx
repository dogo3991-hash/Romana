import { useEffect, useState } from 'react'
import { CameraOff } from 'lucide-react'
import {
  subscribeToCameraMessages,
  useCameraConnected,
  type CameraMessage
} from './cameraConnection'

export function CameraPreview(): React.JSX.Element {
  const connected = useCameraConnected()
  const [frame, setFrame] = useState<string | null>(null)

  useEffect(() => {
    return subscribeToCameraMessages((payload: CameraMessage) => {
      if (payload.type === 'preview-frame' && typeof payload.jpeg === 'string') {
        setFrame(payload.jpeg)
      }
    })
  }, [])

  const showFrame = connected && frame !== null

  return (
    <div className="flex w-60 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">Cámara Romana en vivo</span>
      <div className="flex h-[135px] w-60 items-center justify-center overflow-hidden rounded-lg border border-line bg-black">
        {showFrame ? (
          <img
            src={`data:image/jpeg;base64,${frame}`}
            alt="Vista en vivo de la romana"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted">
            <CameraOff className="h-5 w-5" />
            <span className="text-xs">Sin señal</span>
          </div>
        )}
      </div>
    </div>
  )
}
