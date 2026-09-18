import { env } from '../lib/env'
import { httpTransferService, type TransferService } from './transfer-service'

async function implementation(): Promise<TransferService> {
  return env.useMocks
    ? (await import('../mocks/academic-service')).mockTransferService
    : httpTransferService
}
export const transferService: TransferService = {
  preview: async (...args) => (await implementation()).preview(...args),
  commit: async (...args) => (await implementation()).commit(...args),
  export: async (...args) => (await implementation()).export(...args),
}
