import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthService } from '../../services/auth-service'
import { ApiError, toApiError } from '../../lib/api-error'
import { onSessionExpired } from '../../lib/session-events'
import {
  authSessionSchema,
  type AuthSession,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SecondFactorMethod,
  type TwoFactorChallenge,
} from './auth-schemas'

const MAX_TIMEOUT_DELAY = 2_147_483_647

export type SignOutReason =
  | 'expired'
  | 'challenge-expired'
  | 'logout-failed'
  | 'logout'
  | null
export type AuthState =
  | { status: 'checking' | 'signingOut' }
  | { status: 'unavailable'; message: string }
  | { status: 'anonymous'; reason: SignOutReason }
  | { status: 'authenticated'; session: AuthSession }

export function useAuthController(service: AuthService) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'checking' })
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null)
  const revision = useRef({ value: 0 })

  const clearSession = useCallback(
    (reason: SignOutReason) => {
      revision.current.value++
      setChallenge(null)
      queryClient.clear()
      setState({ status: 'anonymous', reason })
    },
    [queryClient],
  )

  const acceptSession = useCallback(
    (input: AuthSession) => {
      const result = authSessionSchema.safeParse(input)
      if (!result.success)
        throw new ApiError('La sesión recibida no es válida.')
      if (Date.parse(result.data.expiresAt) <= Date.now()) {
        clearSession('expired')
        return false
      }
      queryClient.clear()
      setChallenge(null)
      setState({ status: 'authenticated', session: result.data })
      return true
    },
    [clearSession, queryClient],
  )

  const loadSession = useCallback(
    (signal?: AbortSignal) => {
      const requestRevision = ++revision.current.value
      return service
        .getSession(signal)
        .then((session) => {
          if (signal?.aborted || requestRevision !== revision.current.value)
            return
          if (session) acceptSession(session)
          else clearSession(null)
        })
        .catch((error: unknown) => {
          if (signal?.aborted || requestRevision !== revision.current.value)
            return
          queryClient.clear()
          setState({
            status: 'unavailable',
            message: toApiError(error).message,
          })
        })
    },
    [service, acceptSession, clearSession, queryClient],
  )

  useEffect(() => {
    const abort = new AbortController()
    const activeRevision = revision.current
    void loadSession(abort.signal)
    return () => {
      abort.abort()
      activeRevision.value++
    }
  }, [loadSession])

  const checkSession = useCallback(async () => {
    setState({ status: 'checking' })
    await loadSession()
  }, [loadSession])

  useEffect(
    () => onSessionExpired(() => clearSession('expired')),
    [clearSession],
  )

  const expiresAt =
    state.status === 'authenticated'
      ? state.session.expiresAt
      : challenge?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const expiry = Date.parse(expiresAt)
    const checkExpiry = () => {
      if (Date.now() >= expiry) {
        clearSession(challenge ? 'challenge-expired' : 'expired')
      } else {
        window.clearTimeout(timer)
        timer = window.setTimeout(
          checkExpiry,
          Math.min(expiry - Date.now(), MAX_TIMEOUT_DELAY),
        )
      }
    }
    let timer = window.setTimeout(
      checkExpiry,
      Math.min(Math.max(expiry - Date.now(), 0), MAX_TIMEOUT_DELAY),
    )
    window.addEventListener('focus', checkExpiry)
    document.addEventListener('visibilitychange', checkExpiry)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', checkExpiry)
      document.removeEventListener('visibilitychange', checkExpiry)
    }
  }, [expiresAt, challenge, clearSession])

  const cancelAuthFlow = useCallback(() => {
    clearSession(null)
  }, [clearSession])

  const login = useCallback(
    async (input: LoginInput) => {
      const requestRevision = ++revision.current.value
      setChallenge(null)
      const result = await service.login(input)
      if (requestRevision !== revision.current.value) return
      if (result.kind === 'AUTHENTICATED') acceptSession(result.session)
      else if (Date.parse(result.challenge.expiresAt) <= Date.now())
        clearSession('challenge-expired')
      else setChallenge(result.challenge)
      return result.kind
    },
    [service, acceptSession, clearSession],
  )

  const verifySecondFactor = useCallback(
    async (method: SecondFactorMethod, code: string) => {
      if (!challenge)
        throw new ApiError(
          'Volvé a iniciar sesión para verificar tu identidad.',
        )
      const requestRevision = ++revision.current.value
      try {
        const session = await service.verifySecondFactor({
          challengeId: challenge.challengeId,
          method,
          code,
        })
        if (requestRevision !== revision.current.value) return
        acceptSession(session)
      } catch (error) {
        if (requestRevision !== revision.current.value) return
        if (
          error instanceof ApiError &&
          (error.status === 410 || error.status === 429)
        )
          clearSession('challenge-expired')
        throw error
      }
    },
    [service, challenge, acceptSession, clearSession],
  )

  const logout = useCallback(async () => {
    const requestRevision = ++revision.current.value
    setChallenge(null)
    queryClient.clear()
    setState({ status: 'signingOut' })
    try {
      await service.logout()
      if (requestRevision === revision.current.value) clearSession('logout')
    } catch {
      if (requestRevision === revision.current.value)
        clearSession('logout-failed')
    }
  }, [service, queryClient, clearSession])

  const requestPasswordReset = useCallback(
    (input: ForgotPasswordInput) => service.requestPasswordReset(input),
    [service],
  )
  const resetPassword = useCallback(
    async (input: ResetPasswordInput) => {
      await service.resetPassword(input)
      clearSession(null)
    },
    [service, clearSession],
  )

  return {
    state,
    challenge,
    login,
    verifySecondFactor,
    logout,
    cancelAuthFlow,
    checkSession,
    requestPasswordReset,
    resetPassword,
  }
}
