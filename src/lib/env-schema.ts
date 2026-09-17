import { z } from 'zod'

const apiBaseUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    if (value.startsWith('/') && !value.startsWith('//'))
      return !/[?#\\\s]/.test(value)
    try {
      const url = new URL(value)
      return (
        ['https:', 'http:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      )
    } catch {
      return false
    }
  }, 'VITE_API_BASE_URL debe ser una ruta absoluta o una URL HTTP(S) sin credenciales.')

export const envSchema = z
  .object({
    MODE: z.enum(['development', 'test', 'production']),
    VITE_API_BASE_URL: apiBaseUrlSchema.default('/api/v1'),
    VITE_USE_MOCKS: z.enum(['true', 'false']).default('false'),
  })
  .superRefine((value, context) => {
    if (value.MODE === 'production' && value.VITE_USE_MOCKS === 'true') {
      context.addIssue({
        code: 'custom',
        path: ['VITE_USE_MOCKS'],
        message: 'Los mocks deben estar desactivados en producción.',
      })
    }
  })

export function parseEnv(input: unknown) {
  const parsed = envSchema.safeParse(input)
  if (!parsed.success)
    throw new Error(
      `Configuración inválida: ${parsed.error.issues.map((issue) => issue.message).join(' ')}`,
    )
  return {
    mode: parsed.data.MODE,
    apiBaseUrl: parsed.data.VITE_API_BASE_URL.replace(/\/$/, '') || '/',
    useMocks: parsed.data.VITE_USE_MOCKS === 'true',
  }
}
