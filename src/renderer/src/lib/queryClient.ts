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
      retry: 1
    }
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      notifyError(`No se pudo guardar: ${errorMessage(error)}`)
    }
  })
})
