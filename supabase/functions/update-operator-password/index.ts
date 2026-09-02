// Edge Function: update-operator-password
// Cambia la contraseña de un usuario existente en Supabase Auth.
// Solo puede invocarla un operador autenticado con is_admin = true.
// La service_role key vive únicamente acá (nunca en la app de escritorio).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface UpdatePasswordPayload {
  operator_id: string
  password: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Falta el header Authorization' }, 401)
    }

    // Cliente "como el usuario que llama", para validar que es admin sin poderes elevados
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const {
      data: { user: caller },
      error: callerError
    } = await callerClient.auth.getUser()

    if (callerError || !caller) {
      return jsonResponse({ error: 'No autenticado' }, 401)
    }

    const { data: callerOperator, error: operatorError } = await callerClient
      .from('operators')
      .select('is_admin, active')
      .eq('id', caller.id)
      .single()

    if (operatorError || !callerOperator?.is_admin || !callerOperator?.active) {
      return jsonResponse({ error: 'Requiere permisos de administrador' }, 403)
    }

    const payload = (await req.json()) as UpdatePasswordPayload
    if (!payload.operator_id || !payload.password) {
      return jsonResponse({ error: 'operator_id y password son obligatorios' }, 400)
    }
    if (payload.password.length < 8) {
      return jsonResponse({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
    }

    // Cliente con la service_role key, solo para el cambio de contraseña
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      payload.operator_id,
      { password: payload.password }
    )

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400)
    }

    return jsonResponse({ ok: true }, 200)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Error inesperado' }, 500)
  }
})

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
