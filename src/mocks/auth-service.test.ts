import { describe, expect, it } from 'vitest'
import {
  createMockAuthService,
  mockAdmin,
  mockSecretary,
  MOCK_CHALLENGE_DURATION,
  MOCK_RECOVERY_CODE,
  MOCK_RESET_DURATION,
  MOCK_SESSION_DURATION,
  MOCK_TOTP,
} from './auth-service'
import type { AuthService } from '../services/auth-service'

async function startLogin(service: AuthService, email = mockAdmin.email) {
  const result = await service.login({ email, password: 'valor ficticio' })
  if (result.kind !== 'TWO_FACTOR_REQUIRED')
    throw new Error('Se esperaba desafío 2FA')
  return result.challenge.challengeId
}

describe('Autenticación mock en memoria', () => {
  it('no concede sesión antes del segundo factor, respeta roles y cierra sesión', async () => {
    const service = createMockAuthService()
    const challengeId = await startLogin(service, mockSecretary.email)
    expect(await service.getSession()).toBeNull()
    const session = await service.verifySecondFactor({
      challengeId,
      method: 'TOTP',
      code: MOCK_TOTP,
    })
    expect(session.user.rol).toBe('SECRETARIA')
    await expect(
      service.verifySecondFactor({
        challengeId,
        method: 'TOTP',
        code: MOCK_TOTP,
      }),
    ).rejects.toMatchObject({ status: 410 })
    await service.logout()
    expect(await service.getSession()).toBeNull()
  })
  it('rechaza credenciales desconocidas sin crear sesión', async () => {
    const service = createMockAuthService()
    await expect(
      startLogin(service, 'alumno@demo.facultad.test'),
    ).rejects.toMatchObject({ status: 401 })
    expect(await service.getSession()).toBeNull()
  })
  it('limita intentos y caduca los desafíos', async () => {
    let now = Date.now()
    const service = createMockAuthService({ now: () => now })
    let challengeId = await startLogin(service)
    for (let attempt = 0; attempt < 4; attempt++)
      await expect(
        service.verifySecondFactor({
          challengeId,
          method: 'TOTP',
          code: '000000',
        }),
      ).rejects.toMatchObject({ status: 422 })
    await expect(
      service.verifySecondFactor({
        challengeId,
        method: 'TOTP',
        code: '000000',
      }),
    ).rejects.toMatchObject({ status: 429 })
    await expect(
      service.verifySecondFactor({
        challengeId,
        method: 'TOTP',
        code: MOCK_TOTP,
      }),
    ).rejects.toMatchObject({ status: 410 })
    challengeId = await startLogin(service)
    now += MOCK_CHALLENGE_DURATION
    await expect(
      service.verifySecondFactor({
        challengeId,
        method: 'TOTP',
        code: MOCK_TOTP,
      }),
    ).rejects.toMatchObject({ status: 410 })
  })
  it('consume el código de recuperación una sola vez por cuenta', async () => {
    const service = createMockAuthService()
    const challengeId = await startLogin(service)
    await service.verifySecondFactor({
      challengeId,
      method: 'RECOVERY_CODE',
      code: MOCK_RECOVERY_CODE,
    })
    await service.logout()
    const nextId = await startLogin(service)
    await expect(
      service.verifySecondFactor({
        challengeId: nextId,
        method: 'RECOVERY_CODE',
        code: MOCK_RECOVERY_CODE,
      }),
    ).rejects.toMatchObject({ status: 422 })
    const secretaryId = await startLogin(service, mockSecretary.email)
    expect(
      (
        await service.verifySecondFactor({
          challengeId: secretaryId,
          method: 'RECOVERY_CODE',
          code: MOCK_RECOVERY_CODE,
        })
      ).user.rol,
    ).toBe('SECRETARIA')
  })
  it('caduca la sesión y una instancia nueva no restaura sesiones anteriores', async () => {
    let now = Date.now()
    const service = createMockAuthService({ now: () => now })
    const challengeId = await startLogin(service)
    await service.verifySecondFactor({
      challengeId,
      method: 'TOTP',
      code: MOCK_TOTP,
    })
    expect(await createMockAuthService().getSession()).toBeNull()
    now += MOCK_SESSION_DURATION
    expect(await service.getSession()).toBeNull()
  })
  it('invalida desafíos anteriores al volver a iniciar sesión', async () => {
    const service = createMockAuthService()
    const challengeId = await startLogin(service)
    await startLogin(service, mockSecretary.email)
    await expect(
      service.verifySecondFactor({
        challengeId,
        method: 'TOTP',
        code: MOCK_TOTP,
      }),
    ).rejects.toMatchObject({ status: 410 })
  })
  it('consume enlaces de reset una vez, invalida el anterior y cierra la sesión', async () => {
    const service = createMockAuthService()
    const challengeId = await startLogin(service)
    await service.verifySecondFactor({
      challengeId,
      method: 'TOTP',
      code: MOCK_TOTP,
    })
    const first = await service.requestPasswordReset({ email: mockAdmin.email })
    const second = await service.requestPasswordReset({
      email: mockAdmin.email,
    })
    await expect(
      service.resetPassword({
        token: first.demoToken ?? '',
        password: 'frase nueva ficticia',
      }),
    ).rejects.toMatchObject({ status: 410 })
    const input = {
      token: second.demoToken ?? '',
      password: 'frase nueva ficticia',
    }
    await service.resetPassword(input)
    await expect(service.resetPassword(input)).rejects.toMatchObject({
      status: 410,
    })
    expect(await service.getSession()).toBeNull()
  })
  it('rechaza enlaces vencidos y no emite tokens para cuentas inexistentes', async () => {
    let now = Date.now()
    const service = createMockAuthService({ now: () => now })
    expect(
      await service.requestPasswordReset({
        email: 'noexiste@demo.facultad.test',
      }),
    ).toEqual({})
    const reset = await service.requestPasswordReset({ email: mockAdmin.email })
    now += MOCK_RESET_DURATION
    await expect(
      service.resetPassword({
        token: reset.demoToken ?? '',
        password: 'frase nueva ficticia',
      }),
    ).rejects.toMatchObject({ status: 410 })
  })
})
