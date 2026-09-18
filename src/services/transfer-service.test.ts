import { describe, expect, it, vi } from 'vitest'
import { apiClient } from '../lib/api-client'
import { httpTransferService } from './transfer-service'
import { importTable } from '../test/transfer-fixtures'
import { defaultListParams } from '../features/academic/use-academic'

describe('Contrato REST de importación y exportación', () => {
  it('separa validación y confirmación y propaga cancelación', async () => {
    const table = importTable('profesores')
    const preview = { ...table, errors: [] }
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ data: { data: preview } })
      .mockResolvedValueOnce({
        data: { data: { status: 'IMPORTED', imported: 1 } },
      })
    const signal = new AbortController().signal
    expect(
      await httpTransferService.preview('profesores', table, signal),
    ).toEqual(preview)
    expect(
      await httpTransferService.commit('profesores', table, signal),
    ).toEqual({ status: 'IMPORTED', imported: 1 })
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/profesores/importaciones/validar',
      table,
      { signal },
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/profesores/importaciones',
      table,
      { signal },
    )
  })
  it('admite rechazo atómico con errores por fila y rechaza respuestas incompletas', async () => {
    const table = importTable('alumnos')
    const preview = { ...table, errors: ['Error de relación.'] }
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({
        data: { data: { status: 'INVALID', preview } },
      })
      .mockResolvedValueOnce({ data: { data: { status: 'IMPORTED' } } })
    expect(await httpTransferService.commit('alumnos', table)).toEqual({
      status: 'INVALID',
      preview,
    })
    await expect(
      httpTransferService.commit('alumnos', table),
    ).rejects.toThrow('formato esperado')
    post.mockResolvedValueOnce({ data: { data: { rows: [] } } })
    await expect(
      httpTransferService.preview('alumnos', table),
    ).rejects.toThrow('formato esperado')
  })
  it.each(['csv', 'xlsx'] as const)(
    'exporta %s con filtros y orden, sin limitarse a la página visible',
    async (format) => {
      const blob = new Blob(['archivo'], { type: 'application/octet-stream' })
      const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: blob })
      const signal = new AbortController().signal
      const params = {
        ...defaultListParams('asistencia'),
        search: 'Ana',
        estado: 'PRESENTE',
        page: 3,
        filters: { cursadaId: 'curso-1' },
        sortOrder: 'desc' as const,
      }
      const file = await httpTransferService.export(
        'asistencia',
        params,
        format,
        signal,
      )
      expect(file.blob).toBe(blob)
      expect(file.filename).toMatch(new RegExp(`\\.${format}$`))
      expect(get).toHaveBeenCalledWith('/asistencias/exportar', {
        signal,
        responseType: 'blob',
        params: {
          cursadaId: 'curso-1',
          search: 'Ana',
          estado: 'PRESENTE',
          sortBy: params.sortBy,
          sortOrder: 'desc',
          format,
        },
      })
      get.mockResolvedValueOnce({
        data: new Blob(['{"error":true}'], { type: 'application/json' }),
      })
      await expect(
        httpTransferService.export('asistencia', params, format),
      ).rejects.toThrow('archivo de exportación válido')
    },
  )
})
