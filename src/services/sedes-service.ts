import { apiClient } from '../lib/api-client'
import { ApiError } from '../lib/api-error'
import {
  sedesResponseSchema,
  type SedeSummary,
} from '../features/sedes/sede-schema'

export interface SedesService {
  list(signal?: AbortSignal): Promise<SedeSummary[]>
}

export const httpSedesService: SedesService = {
  async list(signal) {
    const response = await apiClient.get<unknown>(
      '/sedes',
      signal ? { signal } : {},
    )
    const result = sedesResponseSchema.safeParse(response.data)
    if (!result.success)
      throw new ApiError(
        'La respuesta del servidor no tiene el formato esperado.',
      )
    return result.data.data
  },
}
