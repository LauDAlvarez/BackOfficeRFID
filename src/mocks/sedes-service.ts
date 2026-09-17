import type { SedesService } from '../services/sedes-service'

// Sin persistencia ni registros académicos simulados en la Fase 1.
export const mockSedesService: SedesService = {
  list(signal) {
    if (signal?.aborted)
      return Promise.reject(
        new DOMException('Consulta cancelada', 'AbortError'),
      )
    return Promise.resolve([])
  },
}
