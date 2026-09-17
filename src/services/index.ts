import { env } from '../lib/env'
import { httpSedesService, type SedesService } from './sedes-service'

// El import dinámico mantiene los mocks fuera del flujo HTTP y de la UI.
export const sedesService: SedesService = {
  async list(signal) {
    if (env.useMocks) {
      const { mockSedesService } = await import('../mocks/sedes-service')
      return mockSedesService.list(signal)
    }
    return httpSedesService.list(signal)
  },
}
