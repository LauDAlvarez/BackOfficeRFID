import { env } from '../lib/env'
import { httpRfidService, type RfidService } from './rfid-service'

export const rfidService: RfidService = {
  async findPerson(rfid, signal) {
    const implementation = env.useMocks
      ? (await import('../mocks/academic-service')).mockRfidService
      : httpRfidService
    return implementation.findPerson(rfid, signal)
  },
}
