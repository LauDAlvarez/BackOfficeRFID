import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, CanceledError } from 'axios'
import { apiClient } from '../lib/api-client'
import { ApiError } from '../lib/api-error'
import { createHttpAcademicService } from './academic-service'
import { createAcademicData } from '../mocks/academic-data'
import { defaultListParams } from '../features/academic/use-academic'

const service = createHttpAcademicService('sedes')
const params = defaultListParams('sedes')
const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  if (originalAdapter) apiClient.defaults.adapter = originalAdapter
  else delete apiClient.defaults.adapter
})
describe('Contrato HTTP académico', () => {
  it('envía el agregado de cursada con profesores y horarios en una única escritura', async () => {
    const course = createAcademicData().cursadas[0]!
    const put = vi
      .spyOn(apiClient, 'put')
      .mockResolvedValue({ data: { data: course } })
    const saved = await createHttpAcademicService('cursadas').update(
      course.id,
      course,
    )
    expect(put).toHaveBeenCalledExactlyOnceWith(`/cursadas/${course.id}`, {
      materiaId: course.materiaId,
      comisionId: course.comisionId,
      periodoAcademicoId: course.periodoAcademicoId,
      profesorIds: course.profesorIds,
      horarios: course.horarios,
      estado: course.estado,
    })
    expect(saved.horarios).toEqual(course.horarios)
    await expect(
      createHttpAcademicService('cursadas').create({
        ...course,
        profesorIds: ['1', '2', '3', '4'],
      }),
    ).rejects.toThrow('máximo 3')
  })
  it('envía alumno, cursada y condición académica en el contrato de inscripción', async () => {
    const enrollment = createAcademicData().inscripciones[0]!
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { data: enrollment } })
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({
        data: { data: [enrollment], total: 1, page: 1, pageSize: 10 },
      })
    const service = createHttpAcademicService('inscripciones')
    await service.create(enrollment)
    await service.list({
      ...defaultListParams('inscripciones'),
      filters: {
        cursadaId: enrollment.cursadaId,
        condicionAcademica: 'CURSANDO',
      },
    })
    expect(post).toHaveBeenCalledWith(
      '/inscripciones',
      expect.objectContaining({
        alumnoId: enrollment.alumnoId,
        condicionAcademica: 'CURSANDO',
      }),
    )
    expect(get).toHaveBeenCalledWith(
      '/inscripciones',
      expect.objectContaining({
        params: expect.objectContaining({
          cursadaId: enrollment.cursadaId,
          condicionAcademica: 'CURSANDO',
        }),
      }),
    )
  })
  it('envía filtros y paginación con cookies y valida la respuesta', async () => {
    const data = createAcademicData().sedes
    apiClient.defaults.adapter = async (config) => {
      expect(config.url).toBe('/sedes')
      expect(config.baseURL).toBe('/api/v1')
      expect(config.withCredentials).toBe(true)
      expect(config.params).toMatchObject({
        search: 'central',
        estado: 'ACTIVO',
        page: 1,
        pageSize: 10,
      })
      return {
        data: { data, total: 2, page: 1, pageSize: 10 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }
    expect(
      (await service.list({ ...params, search: 'central', estado: 'ACTIVO' }))
        .data,
    ).toEqual(data)
  })
  it('usa GET, POST, PUT y DELETE con contratos validados y rutas escapadas', async () => {
    const record = createAcademicData().sedes[0]!
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: { data: record } })
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { data: record } })
    const put = vi
      .spyOn(apiClient, 'put')
      .mockResolvedValue({ data: { data: record } })
    const remove = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValue({ status: 204 })
    await service.get('id/con barra')
    await service.create(record)
    await service.update(record.id, record)
    await service.softDelete(record.id)
    expect(get).toHaveBeenCalledWith('/sedes/id%2Fcon%20barra', {})
    expect(post).toHaveBeenCalledWith('/sedes', {
      nombre: record.nombre,
      direccion: record.direccion,
      estado: record.estado,
    })
    expect(put).toHaveBeenCalledWith(
      `/sedes/${record.id}`,
      expect.not.objectContaining({ id: record.id }),
    )
    expect(remove).toHaveBeenCalledWith(`/sedes/${record.id}`)
  })
  it.each([
    '<html>SPA</html>',
    { data: [] },
    { data: [{ nombre: 'Sin identidad' }], total: 1, page: 1, pageSize: 10 },
  ])('rechaza respuestas incompatibles: %j', async (data) => {
    apiClient.defaults.adapter = async (config) => ({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })
    await expect(service.list(params)).rejects.toThrow('formato esperado')
  })
  it('rechaza un detalle inválido y un envío sin datos requeridos', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: null } })
    const post = vi.spyOn(apiClient, 'post')
    await expect(service.get('1')).rejects.toThrow('formato esperado')
    await expect(
      service.create({ nombre: '', direccion: '', estado: 'ACTIVO' }),
    ).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })
  it('normaliza errores sin mostrar detalles internos del servidor', async () => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError(
        'detalle interno',
        'ERR_BAD_RESPONSE',
        config,
        null,
        {
          data: 'secreto',
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config,
        },
      )
    }
    await expect(service.list(params)).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'No tenés permiso para realizar esta consulta.',
    })
  })
  it('preserva cancelaciones HTTP y errores ya normalizados', async () => {
    const abort = new AbortController()
    abort.abort()
    await expect(service.list(params, abort.signal)).rejects.toBeInstanceOf(
      CanceledError,
    )
    apiClient.defaults.adapter = async () => {
      throw new ApiError('Error conocido', 503)
    }
    await expect(service.list(params)).rejects.toThrow('Error conocido')
  })
})
