import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Fecha local de hoy ('yyyy-MM-dd') que se actualiza sola al cambiar el día.
 * La app queda abierta toda la noche, así que no basta con calcularla al montar.
 * Además del timer a medianoche se revisa al volver el foco y cada minuto,
 * porque con el PC suspendido los timers se atrasan.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayString)

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>
    const check = (): void => setToday(todayString())
    const scheduleMidnight = (): void => {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      midnightTimer = setTimeout(() => {
        check()
        scheduleMidnight()
      }, next.getTime() - now.getTime())
    }
    scheduleMidnight()
    const interval = setInterval(check, 60_000)
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(midnightTimer)
      clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return today
}

/**
 * Hace avanzar un filtro de fecha/mes cuando cambia `current` (p. ej. el día o
 * el mes actual), pero solo si el filtro seguía en el valor "actual" anterior:
 * si el usuario eligió otra fecha a propósito, no se toca. Mientras `paused`
 * sea true el cambio queda en espera.
 */
export function useFollowToday(
  current: string,
  value: string,
  setValue: (v: string) => void,
  paused = false,
  onRoll?: (v: string) => void
): void {
  const prevRef = useRef(current)

  useEffect(() => {
    if (paused) return
    const prev = prevRef.current
    if (prev === current) return
    prevRef.current = current
    if (value === prev) {
      setValue(current)
      onRoll?.(current)
    }
  }, [current, value, setValue, paused, onRoll])
}
