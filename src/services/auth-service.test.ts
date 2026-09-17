import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { apiClient } from '../lib/api-client'
import { onSessionExpired } from '../lib/session-events'
import { httpAuthService } from './auth-service'
import { mockAdmin } from '../mocks/auth-service'

const adapter = apiClient.defaults.adapter
afterEach(() => {
  if (adapter) apiClient.defaults.adapter = adapter
  else delete apiClient.defaults.adapter
})

describe('Contrato HTTP de autenticación', () => {
  it('restaura la sesión validada por el servidor usando cookies', async () => {
    const session = {
      user: mockAdmin,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }
    apiClient.defaults.adapter = async (config) => {
      expect(config.url).toBe('/auth/session')
      expect(config.withCredentials).toBe(true)
      expect(config.headers.Authorization).toBeUndefined()
      return {
        config,
        data: { data: session },
        status: 200,
        statusText: 'OK',
        headers: {},
      }
    }
    expect(await httpAuthService.getSession()).toEqual(session)
  })
  it('rechaza perfiles no administrativos devueltos por la API', async () => {
    apiClient.defaults.adapter = async (config) => ({
      config,
      data: {
        data: {
          user: { ...mockAdmin, rol: 'ALUMNO' },
          expiresAt: new Date().toISOString(),
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
    })
    await expect(httpAuthService.getSession()).rejects.toThrow(
      'formato esperado',
    )
  })
  it('solo invalida la sesión por un 401 de recursos protegidos', async () => {
    const expired = vi.fn()
    const unsubscribe = onSessionExpired(expired)
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('No autorizado', 'ERR_BAD_REQUEST', config, null, {
        config,
        data: {},
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      })
    }
    try {
      expect(await httpAuthService.getSession()).toBeNull()
      await expect(
        httpAuthService.login({ email: mockAdmin.email, password: 'ficticia' }),
      ).rejects.toMatchObject({ status: 401 })
      expect(expired).not.toHaveBeenCalled()
      await expect(apiClient.get('/sedes')).rejects.toMatchObject({
        status: 401,
      })
      expect(expired).toHaveBeenCalledOnce()
    } finally {
      unsubscribe()
    }
  })
  it('nunca expone un token que la API devuelva accidentalmente en forgot', async () => {
    apiClient.defaults.adapter = async (config) => ({
      config,
      data: { demoToken: 'no-debe-exponerse' },
      status: 200,
      statusText: 'OK',
      headers: {},
    })
    expect(
      await httpAuthService.requestPasswordReset({ email: mockAdmin.email }),
    ).toEqual({})
  })
})
