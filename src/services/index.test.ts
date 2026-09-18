import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
})

describe('Selección central del servicio', () => {
  it('utiliza mocks en desarrollo sin consultar la API', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_USE_MOCKS', 'true')
    const { apiClient } = await import('../lib/api-client')
    const request = vi.spyOn(apiClient, 'get')
    const { academicServices } = await import('./index')
    const { defaultListParams } = await import(
      '../features/academic/use-academic'
    )
    expect(
      (await academicServices.sedes.list(defaultListParams('sedes'))).total,
    ).toBe(2)
    expect(request).not.toHaveBeenCalled()
  })

  it('utiliza HTTP al desactivar mocks y no oculta fallas con datos ficticios', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_USE_MOCKS', 'false')
    const { apiClient } = await import('../lib/api-client')
    const request = vi
      .spyOn(apiClient, 'get')
      .mockRejectedValue(new Error('Sin API'))
    const { academicServices } = await import('./index')
    const { defaultListParams } = await import(
      '../features/academic/use-academic'
    )
    await expect(
      academicServices.sedes.list(defaultListParams('sedes')),
    ).rejects.toThrow('Sin API')
    expect(request).toHaveBeenCalledWith(
      '/sedes',
      expect.objectContaining({ params: expect.objectContaining({ page: 1 }) }),
    )
  })
})
