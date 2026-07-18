// Edge Function: create-operator
// Crea un usuario nuevo en Supabase Auth + su fila en operators.
// Solo puede invocarla un operador autenticado con is_admin = true.
// La service_role key vive únicamente acá (nunca en la app de escritorio).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface CreateOperatorPayload {
  email: string
  password: string
  full_name: string
  is_admin?: boolean
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

    const payload = (await req.json()) as CreateOperatorPayload
    if (!payload.email || !payload.password || !payload.full_name) {
      return jsonResponse({ error: 'email, password y full_name son obligatorios' }, 400)
    }
    if (payload.password.length < 8) {
      return jsonResponse({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
    }

    // Cliente con la service_role key, solo para la creación del usuario
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { full_name: payload.full_name }
    })

    if (createError || !created.user) {
      return jsonResponse({ error: createError?.message ?? 'No se pudo crear el usuario' }, 400)
    }

    // El trigger on_auth_user_created ya insertó la fila en operators.
    // Si se pidió is_admin, la actualizamos (por defecto se crea como no-admin).
    if (payload.is_admin) {
      const { error: updateError } = await adminClient
        .from('operators')
        .update({ is_admin: true })
        .eq('id', created.user.id)

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 400)
      }
    }

    return jsonResponse({ id: created.user.id, email: created.user.email }, 200)
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
