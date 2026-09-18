import { describe, expect, it, vi } from 'vitest'
import { apiClient } from '../lib/api-client'
import { createAcademicData } from '../mocks/academic-data'
import { createHttpAcademicService } from './academic-service'
import { httpRfidService } from './rfid-service'
import { defaultListParams } from '../features/academic/use-academic'

describe('Contratos HTTP de gestión', () => {
  it.each(['asistencia', 'evaluaciones', 'resultados', 'cuotas'] as const)(
    'envía %s con filtros y valida respuestas',
    async (domain) => {
      const record = createAcademicData()[domain][0]!
      const path = domain === 'asistencia' ? '/asistencias' : `/${domain}`
      const get = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValue({
          data: { data: [record], total: 1, page: 1, pageSize: 10 },
        })
      const put = vi
        .spyOn(apiClient, 'put')
        .mockResolvedValue({ data: { data: record } })
      const service = createHttpAcademicService(domain)
      const signal = new AbortController().signal
      await service.list(
        { ...defaultListParams(domain), filters: { alumnoId: 'alumno-1' } },
        signal,
      )
      expect(get).toHaveBeenCalledWith(
        path,
        expect.objectContaining({
          signal,
          params: expect.objectContaining({ alumnoId: 'alumno-1' }),
        }),
      )
      await service.update(record.id, record)
      expect(put).toHaveBeenCalledWith(
        `${path}/${record.id}`,
        expect.not.objectContaining({ deletedAt: null }),
      )
      get.mockResolvedValueOnce({
        data: {
          data: [{ id: 'incompleto' }],
          total: 1,
          page: 1,
          pageSize: 10,
        },
      })
      await expect(service.list(defaultListParams(domain))).rejects.toThrow(
        'formato esperado',
      )
    },
  )
  it('consulta por RFID exacto codificado y admite ausencia explícita', async () => {
    const persona = createAcademicData().alumnos[0]!
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: { data: { tipo: 'ALUMNO', persona } } })
    const signal = new AbortController().signal
    expect(
      await httpRfidService.findPerson('demo/a-1', signal),
    ).toMatchObject({ tipo: 'ALUMNO', persona: { id: persona.id } })
    expect(get).toHaveBeenCalledExactlyOnceWith(
      '/personas/por-rfid/DEMO%2FA-1',
      { signal },
    )
    get.mockResolvedValueOnce({ data: { data: null } })
    expect(await httpRfidService.findPerson('desconocido')).toBeNull()
    get.mockResolvedValueOnce({
      data: { data: { tipo: 'ADMINISTRADOR', persona } },
    })
    await expect(httpRfidService.findPerson('demo')).rejects.toThrow(
      'formato esperado',
    )
  })
})
