function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const row = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) row[j] = j

  for (let i = 1; i <= m; i++) {
    let prevDiag = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = row[j]
      row[j] = a[i - 1] === b[j - 1] ? prevDiag : 1 + Math.min(prevDiag, row[j], row[j - 1])
      prevDiag = temp
    }
  }
  return row[n]
}

function normalize(patente: string): string {
  return patente.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export interface MatchPatenteOptions {
  maxDistance?: number
  minMargin?: number
}

/**
 * Empareja un texto leído por OCR contra patentes candidatas (ej. pesajes en espera).
 * Solo devuelve un match si hay un candidato claramente mejor que el resto — si es
 * ambiguo, devuelve null. Prioriza nunca abrir el camión equivocado por sobre nunca
 * perderse una detección.
 */
export function matchPatente(
  ocrText: string,
  candidates: string[],
  options: MatchPatenteOptions = {}
): string | null {
  const maxDistance = options.maxDistance ?? 2
  const minMargin = options.minMargin ?? 2

  const normalizedOcr = normalize(ocrText)
  if (!normalizedOcr || candidates.length === 0) return null

  const scored = candidates
    .map((patente) => ({ patente, distance: levenshtein(normalizedOcr, normalize(patente)) }))
    .sort((a, b) => a.distance - b.distance)

  const best = scored[0]
  if (!best || best.distance > maxDistance) return null

  const second = scored[1]
  if (second && second.distance - best.distance < minMargin) return null

  return best.patente
}
