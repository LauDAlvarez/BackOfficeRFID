import { ApiError } from '../lib/api-error'
import type { AcademicDatabase } from './academic-data'
import type { TransferService } from '../services/transfer-service'
import {
  canImport,
  importTableSchema,
  type ImportDomain,
  type ImportTable,
} from '../features/transfers/contracts'
import { prepareImport } from '../features/transfers/validation'
import { createTransferFile } from '../features/transfers/files'
import { exportMatrix } from '../features/transfers/export-data'
import type {
  AcademicDomain,
  AcademicRecord,
  InputByDomain,
} from '../features/academic/schemas'
import type { AcademicService } from '../services/academic-service'
import { todayInCordoba } from '../utils/date'

function checkSignal(signal?: AbortSignal) {
  signal?.throwIfAborted()
}
export function createMockTransferService(
  db: AcademicDatabase,
  service: (domain: AcademicDomain) => AcademicService<AcademicDomain>,
): TransferService {
  function prepare<D extends ImportDomain>(domain: D, table: ImportTable) {
    const parsed = importTableSchema.safeParse(table)
    if (!parsed.success)
      throw new ApiError(
        'El lote no tiene una estructura válida o excede los límites de importación.',
        422,
      )
    return prepareImport(domain, parsed.data, db)
  }
  function append<D extends ImportDomain>(
    domain: D,
    inputs: InputByDomain[D][],
  ) {
    const now = new Date().toISOString()
    const records = inputs.map((input) => ({
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
    // Se validó todo el lote. Una única escritura conserva atomicidad en memoria.
    const rows = db[domain] as AcademicRecord<D>[]
    rows.push(...records)
  }
  return {
    async preview(domain, table, signal) {
      checkSignal(signal)
      return prepare(domain, table).preview
    },
    async commit(domain, table, signal) {
      checkSignal(signal)
      const { preview, inputs } = prepare(domain, table)
      if (!canImport(preview)) return { status: 'INVALID', preview }
      append(domain, inputs)
      return { status: 'IMPORTED', imported: inputs.length }
    },
    async export(domain, params, format, signal) {
      checkSignal(signal)
      const rows: AcademicRecord[] = []
      let page = 1
      let expectedTotal: number | undefined
      while (true) {
        const result = await service(domain).list(
          { ...params, page, pageSize: 100 },
          signal,
        )
        if (expectedTotal !== undefined && result.total !== expectedTotal)
          throw new ApiError(
            'Los datos cambiaron durante la exportación. Volvé a intentarlo.',
          )
        expectedTotal = result.total
        if (
          result.page !== page ||
          (!result.data.length && rows.length < result.total)
        )
          throw new ApiError(
            'No se pudo completar la exportación de todas las páginas.',
          )
        rows.push(...result.data)
        if (rows.length >= result.total) break
        page++
      }
      const file = await createTransferFile(
        exportMatrix(domain, rows, db),
        `${domain}-${todayInCordoba()}`,
        format,
      )
      checkSignal(signal)
      return file
    },
  }
}
