import type { CSSProperties } from 'react'

export interface TruckColorOption {
  key: string
  label: string
  hex: [string] | [string, string]
  textColor: string
}

interface BaseColor {
  key: string
  label: string
  hex: string
  text: string
}

const BASE: BaseColor[] = [
  { key: 'blanco', label: 'Blanco', hex: '#FFFFFF', text: '#111827' },
  { key: 'naranjo', label: 'Naranjo', hex: '#F97316', text: '#111827' },
  { key: 'amarillo', label: 'Amarillo', hex: '#EAB308', text: '#111827' },
  { key: 'rojo', label: 'Rojo', hex: '#DC2626', text: '#FFFFFF' },
  { key: 'azul', label: 'Azul', hex: '#2563EB', text: '#FFFFFF' }
]

function pairTextColor(a: BaseColor, b: BaseColor): string {
  // Si alguno de los dos es rojo o azul (fondos oscuros), el texto debe ser claro.
  const dark = new Set(['rojo', 'azul'])
  return dark.has(a.key) || dark.has(b.key) ? '#FFFFFF' : '#111827'
}

const PAIRS: TruckColorOption[] = []
for (let i = 0; i < BASE.length; i++) {
  for (let j = i + 1; j < BASE.length; j++) {
    const a = BASE[i]
    const b = BASE[j]
    PAIRS.push({
      key: `${a.key}-${b.key}`,
      label: `${a.label} / ${b.label}`,
      hex: [a.hex, b.hex],
      textColor: pairTextColor(a, b)
    })
  }
}

export const TRUCK_COLORS: TruckColorOption[] = [
  ...BASE.map((b) => ({ key: b.key, label: b.label, hex: [b.hex] as [string], textColor: b.text })),
  ...PAIRS
]

export function getTruckColor(key: string | null | undefined): TruckColorOption | null {
  if (!key) return null
  return TRUCK_COLORS.find((c) => c.key === key) ?? null
}

function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  const mix = (channel: number): number => Math.round(channel * (1 - amount))
  const toHex = (n: number): string => n.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

export function truckColorCssValue(option: TruckColorOption, variant: 'base' | 'hover'): string {
  const hexes = variant === 'hover' ? option.hex.map((h) => darkenHex(h, 0.15)) : option.hex
  if (hexes.length === 1) return hexes[0]
  return `linear-gradient(90deg, ${hexes[0]} 50%, ${hexes[1]} 50%)`
}

export function truckColorBackground(
  option: TruckColorOption,
  variant: 'base' | 'hover'
): CSSProperties {
  const value = truckColorCssValue(option, variant)
  return option.hex.length === 1 ? { backgroundColor: value } : { backgroundImage: value }
}
