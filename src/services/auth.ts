import { env } from '../lib/env'
import { httpAuthService, type AuthService } from './auth-service'

async function getAuthService(): Promise<AuthService> {
  if (env.useMocks)
    return (await import('../mocks/auth-service')).mockAuthService
  return httpAuthService
}

export const authService: AuthService = {
  getSession: async (signal) => (await getAuthService()).getSession(signal),
  login: async (input) => (await getAuthService()).login(input),
  verifySecondFactor: async (input) =>
    (await getAuthService()).verifySecondFactor(input),
  requestPasswordReset: async (input) =>
    (await getAuthService()).requestPasswordReset(input),
  resetPassword: async (input) => (await getAuthService()).resetPassword(input),
  logout: async () => (await getAuthService()).logout(),
}
