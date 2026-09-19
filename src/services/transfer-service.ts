import { z } from 'zod'
import { apiClient } from '../lib/api-client'
import { ApiError } from '../lib/api-error'
import type { AcademicDomain } from '../features/academic/schemas'
import {
  importPreviewSchema,
  importResultSchema,
  importTableSchema,
  transferMimeTypes,
  type DownloadFile,
  type ImportDomain,
  type ImportPreview,
  type ImportResult,
  type ImportTable,
  type TransferFormat,
} from '../features/transfers/contracts'
import type { ListParams } from './academic-service'
import { todayInCordoba } from '../utils/date'

export interface TransferService {
  preview(
    domain: ImportDomain,
    table: ImportTable,
    signal?: AbortSignal,
  ): Promise<ImportPreview>
  commit(
    domain: ImportDomain,
    table: ImportTable,
    signal?: AbortSignal,
  ): Promise<ImportResult>
  export(
    domain: AcademicDomain,
    params: ListParams,
    format: TransferFormat,
    signal?: AbortSignal,
  ): Promise<DownloadFile>
}
function parse<T>(schema: z.ZodType<T>, response: unknown): T {
  const envelope = z.object({ data: z.unknown() }).safeParse(response)
  const result = schema.safeParse(
    envelope.success ? envelope.data.data : undefined,
  )
  if (!result.success)
    throw new ApiError(
      'La respuesta del servidor no tiene el formato esperado.',
    )
  return result.data
}
export const httpTransferService: TransferService = {
  async preview(domain, table, signal) {
    const response = await apiClient.post<unknown>(
      `/${domain}/importaciones/validar`,
      importTableSchema.parse(table),
      signal ? { signal } : {},
    )
    return parse(importPreviewSchema, response.data)
  },
  async commit(domain, table, signal) {
    const response = await apiClient.post<unknown>(
      `/${domain}/importaciones`,
      importTableSchema.parse(table),
      signal ? { signal } : {},
    )
    return parse(importResultSchema, response.data)
  },
  async export(domain, params, format, signal) {
    const { filters, search, estado, sortBy, sortOrder } = params
    const resource = domain === 'asistencia' ? 'asistencias' : domain
    const response = await apiClient.get<Blob>(`/${resource}/exportar`, {
      params: { ...filters, search, estado, sortBy, sortOrder, format },
      responseType: 'blob',
      headers: { Accept: transferMimeTypes[format] },
      ...(signal ? { signal } : {}),
    })
    if (
      !(response.data instanceof Blob) ||
      !response.data.size ||
      /json|html/i.test(response.data.type)
    )
      throw new ApiError(
        'El servidor no devolvió un archivo de exportación válido.',
      )
    return {
      blob: response.data,
      filename: `${domain}-${todayInCordoba()}.${format}`,
    }
  },
}
