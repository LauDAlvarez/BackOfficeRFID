import { vi } from 'vitest'
import { academicDomains } from '../features/academic/schemas'
import { createMockAcademicDatabase } from '../mocks/academic-service'
import type { AcademicDatabase } from '../mocks/academic-data'
import { academicServices } from '../services/academic'
import { rfidService } from '../services/rfid'
import { transferService } from '../services/transfers'

export function mockAcademicServices(data?: AcademicDatabase) {
  const database = createMockAcademicDatabase(data)
  vi.spyOn(transferService, 'preview').mockImplementation(
    database.transfers.preview,
  )
  vi.spyOn(transferService, 'commit').mockImplementation(
    database.transfers.commit,
  )
  vi.spyOn(transferService, 'export').mockImplementation(
    database.transfers.export,
  )
  vi.spyOn(rfidService, 'findPerson').mockImplementation(
    database.rfid.findPerson,
  )
  for (const domain of academicDomains) {
    const service = database.service(domain)
    vi.spyOn(academicServices[domain], 'list').mockImplementation(
      service.list,
    )
    vi.spyOn(academicServices[domain], 'get').mockImplementation(service.get)
    vi.spyOn(academicServices[domain], 'create').mockImplementation(
      service.create,
    )
    vi.spyOn(academicServices[domain], 'update').mockImplementation(
      service.update,
    )
    vi.spyOn(academicServices[domain], 'softDelete').mockImplementation(
      service.softDelete,
    )
  }
  return database
}
