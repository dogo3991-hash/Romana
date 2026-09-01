// PostgREST corta cada respuesta en un tope fijo (1000 filas por defecto)
// aunque la consulta no pida un limit explícito. Una empresa con más de
// 1000 pesajes en el rango consultado quedaba con los últimos días
// (o camiones) afuera sin ningún error visible. Este helper pagina con
// .range() hasta agotar los resultados.
const PAGE_SIZE = 1000

export async function fetchAllRows<T>(
  buildQuery: (rangeStart: number, rangeEnd: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = []
  let page = 0
  for (;;) {
    const rangeStart = page * PAGE_SIZE
    const rangeEnd = rangeStart + PAGE_SIZE - 1
    const { data, error } = await buildQuery(rangeStart, rangeEnd)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
    page++
  }
  return rows
}
