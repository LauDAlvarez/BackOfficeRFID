import { z } from 'zod'
import { apiClient } from '../lib/api-client'
import { ApiError } from '../lib/api-error'
import {
  type AcademicDomain,
  type AcademicField,
  type AcademicRecord,
  type InputByDomain,
  inputSchemaFor,
  recordSchemaFor,
} from '../features/academic/schemas'

export interface ListParams {
  search: string
  estado: string
  filters: Partial<Record<AcademicField, string>>
  sortBy: AcademicField
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
}
export interface Page<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
export interface AcademicService<D extends AcademicDomain> {
  list(
    params: ListParams,
    signal?: AbortSignal,
  ): Promise<Page<AcademicRecord<D>>>
  get(id: string, signal?: AbortSignal): Promise<AcademicRecord<D>>
  create(input: InputByDomain[D]): Promise<AcademicRecord<D>>
  update(id: string, input: InputByDomain[D]): Promise<AcademicRecord<D>>
  softDelete(id: string): Promise<void>
}
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success)
    throw new ApiError(
      'La respuesta del servidor no tiene el formato esperado.',
    )
  return result.data
}
export function createHttpAcademicService<D extends AcademicDomain>(
  domain: D,
): AcademicService<D> {
  const path = domain === 'asistencia' ? '/asistencias' : `/${domain}`
  const parseRecord = (value: unknown) =>
    parse(
      recordSchemaFor(domain),
      parse(z.object({ data: z.unknown() }), value).data,
    )
  return {
    async list(params, signal) {
      const { filters, ...pagination } = params
      const response = await apiClient.get<unknown>(path, {
        params: { ...pagination, ...filters },
        ...(signal ? { signal } : {}),
      })
      return parse(
        z.object({
          data: z.array(recordSchemaFor(domain)),
          total: z.number().int().nonnegative(),
          page: z.number().int().positive(),
          pageSize: z.number().int().positive(),
        }),
        response.data,
      )
    },
    async get(id, signal) {
      const response = await apiClient.get<unknown>(
        `${path}/${encodeURIComponent(id)}`,
        signal ? { signal } : {},
      )
      return parseRecord(response.data)
    },
    async create(input) {
      const response = await apiClient.post<unknown>(
        path,
        inputSchemaFor(domain).parse(input),
      )
      return parseRecord(response.data)
    },
    async update(id, input) {
      const response = await apiClient.put<unknown>(
        `${path}/${encodeURIComponent(id)}`,
        inputSchemaFor(domain).parse(input),
      )
      return parseRecord(response.data)
    },
    async softDelete(id) {
      await apiClient.delete(`${path}/${encodeURIComponent(id)}`)
    },
  }
}
