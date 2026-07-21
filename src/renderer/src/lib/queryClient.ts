import { QueryClient, MutationCache } from '@tanstack/react-query'
import { notifyError } from '@renderer/components/ui/toast'

function errorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return 'Ocurrió un error inesperado'
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      // Por defecto React Query pausa los pedidos cuando el navegador se
      // reporta a sí mismo offline, en vez de intentarlos y fallar — eso
      // dejaba los guardados "colgados" en silencio sin que nuestro timeout
      // de fetch llegara siquiera a correr. Con 'always' se intenta igual,
      // así el timeout puede hacer su trabajo y avisar del error a tiempo.
      networkMode: 'always'
    },
    mutations: {
      networkMode: 'always'
    }
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      notifyError(`No se pudo guardar: ${errorMessage(error)}`)
    }
  })
})
