import type { AuthService } from '../services/auth-service'
import type {
  AdministrativeUser,
  AuthSession,
} from '../features/auth/auth-schemas'
import { ApiError } from '../lib/api-error'

// Valores públicos y deliberadamente predecibles para probar pantallas. No son autenticadores reales.
export const MOCK_TOTP = '123456'
export const MOCK_RECOVERY_CODE = 'DEMO-RECUPERAR-01'
export const MOCK_SESSION_DURATION = 30 * 60_000
export const MOCK_CHALLENGE_DURATION = 5 * 60_000
export const MOCK_RESET_DURATION = 15 * 60_000
export const mockAdmin: AdministrativeUser = {
  id: 'demo-admin',
  nombre: 'Ana',
  apellido: 'García',
  email: 'admin@demo.facultad.test',
  rol: 'ADMINISTRADOR',
  estado: 'ACTIVO',
  twoFactorEnabled: true,
}
export const mockSecretary: AdministrativeUser = {
  id: 'demo-secretaria',
  nombre: 'Elena',
  apellido: 'López',
  email: 'secretaria@demo.facultad.test',
  rol: 'SECRETARIA',
  estado: 'ACTIVO',
  twoFactorEnabled: true,
}

export function createMockAuthService({
  now = () => Date.now(),
  initialSession = null,
}: {
  now?: () => number
  initialSession?: AuthSession | null
} = {}): AuthService {
  let session = initialSession
  let sequence = 0
  let challenge: {
    id: string
    user: AdministrativeUser
    expiresAt: number
    attempts: number
  } | null = null
  const usedRecoveryCodes = new Set<string>()
  const resetTokens = new Map<string, { userId: string; expiresAt: number }>()
  const accounts = [mockAdmin, mockSecretary]

  return {
    getSession(signal) {
      if (signal?.aborted)
        return Promise.reject(
          new DOMException('Consulta cancelada', 'AbortError'),
        )
      if (session && Date.parse(session.expiresAt) <= now()) session = null
      return Promise.resolve(session ? structuredClone(session) : null)
    },
    login({ email }) {
      session = null
      challenge = null
      const user = accounts.find(
        (account) => account.email === email.trim().toLowerCase(),
      )
      // La contraseña no se compara, copia ni almacena. El aviso de demo lo informa.
      if (!user)
        return Promise.reject(
          new ApiError('Email o contraseña incorrectos.', 401),
        )
      challenge = {
        id: `desafio-demo-${++sequence}`,
        user,
        expiresAt: now() + MOCK_CHALLENGE_DURATION,
        attempts: 0,
      }
      return Promise.resolve({
        kind: 'TWO_FACTOR_REQUIRED',
        challenge: {
          challengeId: challenge.id,
          expiresAt: new Date(challenge.expiresAt).toISOString(),
        },
      })
    },
    verifySecondFactor({ challengeId, method, code }) {
      if (
        !challenge ||
        challenge.id !== challengeId ||
        challenge.expiresAt <= now()
      ) {
        return Promise.reject(
          new ApiError('La verificación venció. Volvé a iniciar sesión.', 410),
        )
      }
      const recoveryValid =
        code.trim() === MOCK_RECOVERY_CODE &&
        !usedRecoveryCodes.has(challenge.user.id)
      const valid =
        method === 'TOTP'
          ? code.trim() === MOCK_TOTP
          : method === 'RECOVERY_CODE' && recoveryValid
      if (!valid) {
        challenge.attempts++
        if (challenge.attempts >= 5) {
          challenge = null
          return Promise.reject(
            new ApiError(
              'Se agotaron los intentos. Volvé a iniciar sesión.',
              429,
            ),
          )
        }
        return Promise.reject(
          new ApiError('El código es incorrecto o ya fue utilizado.', 422),
        )
      }
      if (method === 'RECOVERY_CODE') usedRecoveryCodes.add(challenge.user.id)
      session = {
        user: { ...challenge.user },
        expiresAt: new Date(now() + MOCK_SESSION_DURATION).toISOString(),
      }
      challenge = null
      return Promise.resolve(structuredClone(session))
    },
    requestPasswordReset({ email }) {
      const account = accounts.find(
        (user) => user.email === email.trim().toLowerCase(),
      )
      // Solo la demo devuelve un enlace visible: no se envían emails.
      if (!account) return Promise.resolve({})
      for (const [token, reset] of resetTokens) {
        if (reset.userId === account.id) resetTokens.delete(token)
      }
      const demoToken = `restablecimiento-demo-${++sequence}`
      resetTokens.set(demoToken, {
        userId: account.id,
        expiresAt: now() + MOCK_RESET_DURATION,
      })
      return Promise.resolve({ demoToken })
    },
    resetPassword({ token }) {
      const reset = resetTokens.get(token)
      if (!reset || reset.expiresAt <= now())
        return Promise.reject(
          new ApiError(
            'El enlace es inválido, venció o ya fue utilizado.',
            410,
          ),
        )
      resetTokens.delete(token)
      session = null
      challenge = null
      // No se guarda ni transforma la contraseña. Solo se consume el token de demostración.
      return Promise.resolve()
    },
    logout() {
      session = null
      challenge = null
      return Promise.resolve()
    },
  }
}

export const mockAuthService = createMockAuthService()
