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

export function setTicketPrinter(name: string | null): void {
  try {
    if (name) localStorage.setItem(KEY, name)
    else localStorage.removeItem(KEY)
  } catch {
    // localStorage no disponible: se usará la impresora predeterminada.
  }
}
