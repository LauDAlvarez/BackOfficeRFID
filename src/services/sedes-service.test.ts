import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, CanceledError } from 'axios'
import { apiClient } from '../lib/api-client'
import { ApiError } from '../lib/api-error'
import { httpSedesService } from './sedes-service'
import { mockSedesService } from '../mocks/sedes-service'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  if (originalAdapter) apiClient.defaults.adapter = originalAdapter
  else delete apiClient.defaults.adapter
})

describe('Contrato de servicios', () => {
  it('consulta con cookies y valida la respuesta HTTP', async () => {
    const data = [
      {
        id: 'sede-1',
        nombre: 'Sede central',
        direccion: 'Córdoba',
        estado: 'ACTIVO',
      },
    ]
    apiClient.defaults.adapter = async (config) => {
      expect(config.url).toBe('/sedes')
      expect(config.baseURL).toBe('/api/v1')
      expect(config.withCredentials).toBe(true)
      return {
        data: { data },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }
    expect(await httpSedesService.list()).toEqual(data)
  })
  it('rechaza HTML o datos incompatibles en lugar de considerarlos una lista vacía', async () => {
    apiClient.defaults.adapter = async (config) => ({
      data: '<html>SPA</html>',
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })
    await expect(httpSedesService.list()).rejects.toThrow('formato esperado')
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
    await expect(httpSedesService.list()).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'No tenés permiso para realizar esta consulta.',
    })
  })
  it('preserva cancelaciones de consultas HTTP', async () => {
    const abort = new AbortController()
    abort.abort()
    await expect(httpSedesService.list(abort.signal)).rejects.toBeInstanceOf(
      CanceledError,
    )
  })
  it('el mock no llama a HTTP ni persiste datos entre consultas', async () => {
    const request = vi.spyOn(apiClient, 'get')
    const first = await mockSedesService.list()
    first.push({ id: '1', nombre: 'Temporal', direccion: '', estado: 'ACTIVO' })
    expect(await mockSedesService.list()).toEqual([])
    expect(request).not.toHaveBeenCalled()
  })
  it('no convierte un error normalizado en otro mensaje', async () => {
    apiClient.defaults.adapter = async () => {
      throw new ApiError('Error conocido', 503)
    }
    await expect(httpSedesService.list()).rejects.toThrow('Error conocido')
  })
})
