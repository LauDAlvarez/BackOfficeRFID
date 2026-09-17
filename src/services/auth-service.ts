import type { z } from 'zod'
import { apiClient } from '../lib/api-client'
import { ApiError } from '../lib/api-error'
import {
  authSessionSchema,
  loginResultSchema,
  type AuthSession,
  type ForgotPasswordInput,
  type LoginInput,
  type LoginResult,
  type ResetPasswordInput,
  type VerifySecondFactorInput,
} from '../features/auth/auth-schemas'

export interface AuthService {
  getSession(signal?: AbortSignal): Promise<AuthSession | null>
  login(input: LoginInput): Promise<LoginResult>
  verifySecondFactor(input: VerifySecondFactorInput): Promise<AuthSession>
  requestPasswordReset(
    input: ForgotPasswordInput,
  ): Promise<{ demoToken?: string }>
  resetPassword(input: ResetPasswordInput): Promise<void>
  logout(): Promise<void>
}

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(
    typeof data === 'object' && data !== null && 'data' in data
      ? data.data
      : undefined,
  )
  if (!result.success)
    throw new ApiError(
      'La respuesta de autenticación no tiene el formato esperado.',
    )
  return result.data
}

export const httpAuthService: AuthService = {
  async getSession(signal) {
    try {
      const { data } = await apiClient.get<unknown>(
        '/auth/session',
        signal ? { signal } : {},
      )
      return parseResponse(authSessionSchema.nullable(), data)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  async login(input) {
    const { data } = await apiClient.post<unknown>('/auth/login', input)
    return parseResponse(loginResultSchema, data)
  },
  async verifySecondFactor(input) {
    const { data } = await apiClient.post<unknown>(
      '/auth/two-factor/verify',
      input,
    )
    return parseResponse(authSessionSchema, data)
  },
  async requestPasswordReset(input) {
    await apiClient.post('/auth/password/forgot', input)
    // La API real nunca entrega tokens de recuperación al solicitante.
    return {}
  },
  async resetPassword(input) {
    await apiClient.post('/auth/password/reset', input)
  },
  async logout() {
    await apiClient.post('/auth/logout')
  },
}
