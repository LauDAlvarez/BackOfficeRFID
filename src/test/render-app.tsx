import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { App } from '../app/App'
import { AuthProvider } from '../features/auth/AuthProvider'
import type { AuthSession } from '../features/auth/auth-schemas'
import type { AuthService } from '../services/auth-service'
import {
  createMockAuthService,
  mockAdmin,
  MOCK_SESSION_DURATION,
} from '../mocks/auth-service'

export async function renderApp(
  path = '/',
  options: {
    service?: AuthService
    session?: AuthSession | null
    client?: QueryClient
    waitForReady?: boolean
  } = {},
) {
  const client =
    options.client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
  const session =
    options.session === undefined
      ? {
          user: mockAdmin,
          expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
        }
      : options.session
  const service =
    options.service ?? createMockAuthService({ initialSession: session })
  const result = render(
    <QueryClientProvider client={client}>
      <AuthProvider service={service}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
  if (options.waitForReady !== false) await screen.findByRole('main')
  return { ...result, client, service }
}
