import truckAlertSound from '@renderer/assets/truck-alert.ogg'

const BEEP_COUNT = 3
const BEEP_SPACING_S = 0.25
const BEEP_PEAK_GAIN = 0.83

function playAlertBeeps(): void {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < BEEP_COUNT; i++) {
      const start = ctx.currentTime + i * BEEP_SPACING_S
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(BEEP_PEAK_GAIN, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.2)
    }
    const totalDurationMs = (BEEP_COUNT - 1) * BEEP_SPACING_S * 1000 + 250
    setTimeout(() => void ctx.close(), totalDurationMs)
  } catch {
    // El navegador puede bloquear audio sin gesto del usuario; no es crítico.
  }
}

function playTruckAlertSound(): void {
  try {
    const audio = new Audio(truckAlertSound)
    audio.play().catch((err: unknown) => {
      console.error('playTruckAlertSound failed:', err)
    })
  } catch (err) {
    console.error('playTruckAlertSound failed:', err)
  }
}

// Alerta sonora de "llegó un camión": la usan la detección por cámara y la alerta
// por romana (peso sobre 1000 kg).
export function playTruckAlert(): void {
  playAlertBeeps()
  playTruckAlertSound()
}
