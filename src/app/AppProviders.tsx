import { useState, type PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '../lib/query-client'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { AuthProvider } from '../features/auth/AuthProvider'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient)

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
