import { describe, expect, it } from 'vitest'
import { parseEnv } from './env-schema'

describe('Configuración de ambientes', () => {
  it('interpreta false como booleano y no activa mocks por omisión', () => {
    expect(
      parseEnv({ MODE: 'production', VITE_USE_MOCKS: 'false' }).useMocks,
    ).toBe(false)
    expect(parseEnv({ MODE: 'development' }).useMocks).toBe(false)
    expect(parseEnv({ MODE: 'test', VITE_USE_MOCKS: 'true' }).useMocks).toBe(
      true,
    )
  })
  it('rechaza mocks en producción y valores ambiguos', () => {
    expect(() =>
      parseEnv({ MODE: 'production', VITE_USE_MOCKS: 'true' }),
    ).toThrow('desactivados en producción')
    expect(() => parseEnv({ MODE: 'test', VITE_USE_MOCKS: 'yes' })).toThrow(
      'Configuración inválida',
    )
  })
  it.each([
    '//otro-host/api',
    'javascript:alert(1)',
    'api/v1',
    'https://usuario:clave@ejemplo.edu/api',
    '/api?token=abc',
  ])('rechaza bases no válidas: %s', (url) => {
    expect(() => parseEnv({ MODE: 'test', VITE_API_BASE_URL: url })).toThrow(
      'Configuración inválida',
    )
  })
  it('admite una API externa y normaliza la barra final', () => {
    expect(
      parseEnv({
        MODE: 'test',
        VITE_API_BASE_URL: 'https://api.ejemplo.edu/api/v1/',
      }).apiBaseUrl,
    ).toBe('https://api.ejemplo.edu/api/v1')
  })
})
