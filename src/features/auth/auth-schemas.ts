import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .email('Ingresá un email válido.')
  .max(254, 'El email es demasiado largo.')
  .toLowerCase()
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Ingresá tu contraseña.')
    .max(128, 'Ingresá hasta 128 caracteres.'),
})
export const forgotPasswordSchema = z.object({ email: emailSchema })
export const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Ingresá los 6 dígitos del código.'),
})
export const recoveryCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, 'Ingresá el código de recuperación completo.')
    .max(64, 'El código es demasiado largo.'),
})
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(15, 'Usá al menos 15 caracteres.')
      .max(128, 'Ingresá hasta 128 caracteres.'),
    confirmation: z.string().min(1, 'Repetí la nueva contraseña.'),
  })
  .refine(({ password, confirmation }) => password === confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  })

export const administrativeUserSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email(),
  rol: z.enum(['ADMINISTRADOR', 'SECRETARIA']),
  estado: z.literal('ACTIVO'),
  twoFactorEnabled: z.boolean(),
})
export const authSessionSchema = z.object({
  user: administrativeUserSchema,
  expiresAt: z.string().datetime(),
})
export const twoFactorChallengeSchema = z.object({
  challengeId: z.string().min(1),
  expiresAt: z.string().datetime(),
})
export const loginResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('AUTHENTICATED'), session: authSessionSchema }),
  z.object({
    kind: z.literal('TWO_FACTOR_REQUIRED'),
    challenge: twoFactorChallengeSchema,
  }),
])

export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type CodeValues = z.infer<typeof totpSchema>
export type AdministrativeUser = z.infer<typeof administrativeUserSchema>
export type AuthSession = z.infer<typeof authSessionSchema>
export type TwoFactorChallenge = z.infer<typeof twoFactorChallengeSchema>
export type LoginResult = z.infer<typeof loginResultSchema>
export type SecondFactorMethod = 'TOTP' | 'RECOVERY_CODE'
export interface VerifySecondFactorInput {
  challengeId: string
  method: SecondFactorMethod
  code: string
}
export interface ResetPasswordInput {
  token: string
  password: string
}
