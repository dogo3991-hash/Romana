// Impresora elegida para la impresión automática de tickets. Se guarda en este PC
// (cada PC puede tener su propia impresora); null = la predeterminada de Windows.
const KEY = 'ticketPrinter'

export function getTicketPrinter(): string | null {
  try {
    return localStorage.getItem(KEY) || null
  } catch {
    return null
  }
}

// Impresión automática al completar un pesaje: encendida salvo que se apague en
// este PC.
const AUTO_PRINT_KEY = 'ticketAutoPrint'

export function isAutoPrintEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_PRINT_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setAutoPrintEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.removeItem(AUTO_PRINT_KEY)
    else localStorage.setItem(AUTO_PRINT_KEY, 'off')
  } catch {
    // localStorage no disponible: sigue imprimiendo.
  }
}

export function setTicketPrinter(name: string | null): void {
  try {
    if (name) localStorage.setItem(KEY, name)
    else localStorage.removeItem(KEY)
  } catch {
    // localStorage no disponible: se usará la impresora predeterminada.
  }
}
