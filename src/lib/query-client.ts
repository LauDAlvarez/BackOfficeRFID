import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api-error'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          !(
            error instanceof ApiError &&
            error.status !== null &&
            error.status >= 400 &&
            error.status < 500
          ) && failureCount < 1,
      },
      mutations: { retry: false },
    },
  })
}
