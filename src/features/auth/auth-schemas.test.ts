import { describe, expect, it } from 'vitest'
import {
  administrativeUserSchema,
  loginSchema,
  recoveryCodeSchema,
  resetPasswordSchema,
  totpSchema,
} from './auth-schemas'
import { mockAdmin } from '../../mocks/auth-service'

describe('Validación de autenticación', () => {
  it('normaliza el email pero conserva exactamente la contraseña', () => {
    expect(
      loginSchema.parse({
        email: '  ADMIN@DEMO.FACULTAD.TEST ',
        password: '  mi frase secreta  ',
      }),
    ).toEqual({
      email: 'admin@demo.facultad.test',
      password: '  mi frase secreta  ',
    })
    expect(
      loginSchema.safeParse({ email: 'incorrecto', password: '' }).success,
    ).toBe(false)
  })
  it.each(['PROFESOR', 'ALUMNO', 'otro'])(
    'rechaza el rol %s como usuario administrativo',
    (rol) => {
      expect(
        administrativeUserSchema.safeParse({ ...mockAdmin, rol }).success,
      ).toBe(false)
    },
  )
  it('rechaza sesiones de cuentas inactivas', () => {
    expect(
      administrativeUserSchema.safeParse({ ...mockAdmin, estado: 'INACTIVO' })
        .success,
    ).toBe(false)
  })
  it('exige seis dígitos y conserva ceros iniciales en TOTP', () => {
    expect(totpSchema.parse({ code: ' 001234 ' }).code).toBe('001234')
    for (const code of ['12345', '1234567', '12a456', '1e0000'])
      expect(totpSchema.safeParse({ code }).success).toBe(false)
    expect(
      recoveryCodeSchema.safeParse({ code: 'DEMO-RECUPERAR-01' }).success,
    ).toBe(true)
  })
  it('exige longitud y coincidencia al restablecer sin truncar contraseñas', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'contraseña breve',
        confirmation: 'otra',
      }).success,
    ).toBe(false)
    expect(
      resetPasswordSchema.safeParse({
        password: 'x'.repeat(129),
        confirmation: 'x'.repeat(129),
      }).success,
    ).toBe(false)
    expect(
      resetPasswordSchema.safeParse({
        password: 'frase larga para ingresar',
        confirmation: 'frase larga para ingresar',
      }).success,
    ).toBe(true)
    expect(
      resetPasswordSchema.safeParse({
        password: 'corta',
        confirmation: 'corta',
      }).success,
    ).toBe(false)
  })
})
