import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@renderer/lib/supabaseClient'
import { getOfflineDb } from '@renderer/lib/offlineDb'
import { readThroughOne } from '@renderer/lib/offlineRepo'
import type { Database } from '@renderer/types/database.types'

type Operator = Database['public']['Tables']['operators']['Row']

interface AuthContextValue {
  session: Session | null
  operator: Operator | null
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  retryLoadOperator: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null)
  const [operator, setOperator] = useState<Operator | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setOperator(null)
        setLoading(false)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    let cancelled = false

    async function loadOperator(): Promise<void> {
      setLoading(true)
      setAuthError(null)
      try {
        const data = await readThroughOne<Operator>({
          remote: () => supabase.from('operators').select('*').eq('id', session!.user.id).single(),
          readLocal: async () => {
            const db = await getOfflineDb()
            return (await db.get('operators', session!.user.id)) ?? null
          },
          writeLocal: async (row) => {
            const db = await getOfflineDb()
            await db.put('operators', row)
          }
        })
        if (cancelled) return
        if (!data) throw new Error('sin conexión y sin perfil guardado localmente')
        setOperator(data)
      } catch (err) {
        if (cancelled) return
        console.error('loadOperator failed:', err)
        setAuthError(err instanceof Error ? err.message : 'sin conexión con el servidor')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOperator()

    return () => {
      cancelled = true
    }
  }, [session, retryCount])

  function retryLoadOperator(): void {
    setRetryCount((c) => c + 1)
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? traducirError(error.message) : null }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ session, operator, loading, authError, signIn, signOut, retryLoadOperator }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

function traducirError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email o contraseña incorrectos'
  return message
}
