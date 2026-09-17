import axios from 'axios'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null
    if (status === 401)
      return new ApiError('La sesión no está disponible o ha expirado.', status)
    if (status === 403)
      return new ApiError(
        'No tenés permiso para realizar esta consulta.',
        status,
      )
    if (status === 404)
      return new ApiError('El recurso solicitado no está disponible.', status)
    if (status === 422)
      return new ApiError(
        'Revisá los datos enviados e intentá nuevamente.',
        status,
      )
    return new ApiError(
      status === null
        ? 'No pudimos conectar con el servidor. Intentá nuevamente.'
        : 'El servidor no pudo completar la consulta. Intentá nuevamente.',
      status,
    )
  }
  return new ApiError('No pudimos completar la consulta. Intentá nuevamente.')
}
