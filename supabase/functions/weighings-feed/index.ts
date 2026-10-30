// Edge Function: weighings-feed
// Lectura de pesajes completados para empresas externas (ej. el comprador de
// mineral), autenticada con una clave de API propia (tabla api_keys, migración
// 0025) en vez de una sesión de operador. Solo GET: no hay forma de crear,
// editar ni borrar nada por acá, y cada clave ve únicamente su empresa.
//
// Se despliega con --no-verify-jwt porque quien llama no tiene sesión de Supabase.
//
// Uso:
//   GET /functions/v1/weighings-feed?desde=2026-10-01&hasta=2026-10-16
//   Header: x-api-key: <clave>
// Sin fechas devuelve el día de hoy (hora de Chile). Rango máximo: 31 días.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const MAX_RANGE_DAYS = 31
const PAGE_SIZE = 1000
const TIME_ZONE = 'America/Santiago'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-api-key, content-type'
}

interface WeighingRow {
  id: string
  fecha: string
  hora_entrada: string
  hora_salida: string | null
  conductor: string
  patente: string
  n_guia: string
  producto: string | null
  tara: number | null
  peso_bruto: number | null
  carga: number | null
  traslado: string | null
  updated_at: string
  transportistas: { nombre: string } | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Solo se permite GET' }, 405)
  }

  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return jsonResponse({ error: 'Falta el header x-api-key' }, 401)
    }

    const url = new URL(req.url)
    const desde = url.searchParams.get('desde') ?? todayInChile()
    const hasta = url.searchParams.get('hasta') ?? desde
    if (!isIsoDate(desde) || !isIsoDate(hasta)) {
      return jsonResponse({ error: 'desde y hasta deben tener formato AAAA-MM-DD' }, 400)
    }
    if (hasta < desde) {
      return jsonResponse({ error: 'hasta no puede ser anterior a desde' }, 400)
    }
    if (daysBetween(desde, hasta) > MAX_RANGE_DAYS) {
      return jsonResponse({ error: `El rango máximo es de ${MAX_RANGE_DAYS} días` }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // Claves nuevas (sb_secret_), para poder desactivar las legacy JWT
    const serviceRoleKey =
      newApiKey('SUPABASE_SECRET_KEYS') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: key, error: keyError } = await adminClient
      .from('api_keys')
      .select('id, company_id, rate_limit_per_hour')
      .eq('key_hash', await sha256Hex(apiKey))
      .eq('active', true)
      .maybeSingle()

    if (keyError) {
      return jsonResponse({ error: 'Error al validar la clave' }, 500)
    }
    if (!key) {
      return jsonResponse({ error: 'Clave inválida o desactivada' }, 401)
    }

    // Cuenta también las consultas rechazadas: si no, un cliente que reintenta
    // sin parar nunca vería bajar su contador hasta que cambie la hora.
    const { data: used, error: hitError } = await adminClient.rpc('api_key_hit', {
      p_key_id: key.id
    })
    if (hitError) {
      return jsonResponse({ error: 'Error al validar la clave' }, 500)
    }
    if (used > key.rate_limit_per_hour) {
      return jsonResponse(
        {
          error: `Límite de ${key.rate_limit_per_hour} consultas por hora alcanzado; se libera en la hora siguiente`
        },
        429,
        { 'Retry-After': String(secondsUntilNextHour()) }
      )
    }

    const rows: WeighingRow[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await adminClient
        .from('weighings')
        .select(
          'id, fecha, hora_entrada, hora_salida, conductor, patente, n_guia, producto, tara, peso_bruto, carga, traslado, updated_at, transportistas(nombre)'
        )
        .eq('company_id', key.company_id)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        // Solo pesajes completados: los pendientes aún no tienen peso neto.
        .not('carga', 'is', null)
        .order('fecha')
        .order('hora_entrada')
        .range(from, from + PAGE_SIZE - 1)
        .returns<WeighingRow[]>()
      if (error) {
        return jsonResponse({ error: 'Error al leer los pesajes' }, 500)
      }
      rows.push(...data)
      if (data.length < PAGE_SIZE) break
    }

    return jsonResponse(
      {
        desde,
        hasta,
        total: rows.length,
        pesajes: rows.map((r) => ({
          id: r.id,
          fecha: r.fecha,
          hora_entrada: r.hora_entrada,
          hora_salida: r.hora_salida,
          transportista: r.transportistas?.nombre ?? null,
          conductor: r.conductor,
          patente: r.patente,
          n_guia: r.n_guia,
          producto: r.producto,
          tara_kg: r.tara,
          peso_bruto_kg: r.peso_bruto,
          peso_neto_kg: r.carga,
          traslado: r.traslado,
          actualizado: r.updated_at
        }))
      },
      200
    )
  } catch {
    return jsonResponse({ error: 'Error inesperado' }, 500)
  }
})

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function daysBetween(a: string, b: string): number {
  return (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000
}

// en-CA da el formato AAAA-MM-DD.
function todayInChile(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Supabase expone las claves nuevas como JSON { "<nombre>": "<clave>" }
function newApiKey(envName: string): string | undefined {
  try {
    const keys = JSON.parse(Deno.env.get(envName) ?? '{}') as Record<string, string>
    return keys.default ?? Object.values(keys)[0]
  } catch {
    return undefined
  }
}

function secondsUntilNextHour(): number {
  const now = new Date()
  return 3600 - now.getUTCMinutes() * 60 - now.getUTCSeconds()
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders }
  })
}
