import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { academicServices } from '../../services/academic'
import { ApiError } from '../../lib/api-error'
import type { ListParams } from '../../services/academic-service'
import { usePermissions } from '../auth/use-permissions'
import type { AcademicDomain, AcademicInput, AcademicRecord } from './schemas'
import { catalog, type Lookups } from './catalog'

export function defaultListParams(domain: AcademicDomain): ListParams {
  return {
    search: '',
    estado: '',
    filters: {},
    sortBy: catalog[domain].columns[0]!,
    sortOrder: 'asc',
    page: 1,
    pageSize: 10,
  }
}
export function useAcademicList(domain: AcademicDomain, params: ListParams) {
  return useQuery({
    queryKey: ['academic', domain, 'list', params],
    queryFn: ({ signal }) => academicServices[domain].list(params, signal),
  })
}
export function useAcademicRecord(domain: AcademicDomain, id?: string) {
  return useQuery({
    queryKey: ['academic', domain, 'detail', id],
    queryFn: ({ signal }) => academicServices[domain].get(id!, signal),
    enabled: Boolean(id),
  })
}
export function useAcademicLookups(domain: AcademicDomain) {
  const dependencies = [
    ...new Set([
      ...catalog[domain].fields.flatMap((field) =>
        field.relation ? [field.relation] : [],
      ),
      ...(catalog[domain].lookupDomains ?? []),
    ]),
  ].sort()
  return useQuery({
    queryKey: ['academic', 'lookups', dependencies],
    queryFn: async ({ signal }): Promise<Lookups> => {
      const entries = await Promise.all(
        dependencies.map(async (related) => {
          const records: AcademicRecord[] = []
          const seen = new Set<string>()
          let expectedTotal: number | undefined
          let page = 1
          while (true) {
            const result = await academicServices[related].list(
              { ...defaultListParams(related), page, pageSize: 100 },
              signal,
            )
            if (
              result.page !== page ||
              (expectedTotal !== undefined &&
                result.total !== expectedTotal) ||
              records.length + result.data.length > result.total ||
              (!result.data.length && records.length < result.total)
            )
              throw new ApiError(
                'La consulta de referencias cambió o devolvió páginas incompletas. Volvé a intentarlo.',
              )
            expectedTotal = result.total
            for (const record of result.data) {
              if (seen.has(record.id))
                throw new ApiError(
                  'La consulta de referencias devolvió registros repetidos. Volvé a intentarlo.',
                )
              seen.add(record.id)
            }
            records.push(...result.data)
            if (!result.data.length || records.length >= result.total) break
            page += 1
          }
          return [related, records] as const
        }),
      )
      return Object.fromEntries(entries)
    },
  })
}
export function useAcademicMutations(domain: AcademicDomain) {
  const client = useQueryClient()
  const { can } = usePermissions()
  const invalidate = () =>
    client.invalidateQueries({ queryKey: ['academic'] })
  const save = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string | undefined
      input: AcademicInput
    }) => {
      if (!can(id ? 'update' : 'create'))
        throw new ApiError('No tenés permiso para modificar registros.', 403)
      return id
        ? academicServices[domain].update(id, input)
        : academicServices[domain].create(input)
    },
    onSuccess: invalidate,
    gcTime: 0,
  })
  const remove = useMutation({
    mutationFn: (id: string) => {
      if (!can('delete'))
        throw new ApiError(
          'No tenés permiso para dar de baja registros.',
          403,
        )
      return academicServices[domain].softDelete(id)
    },
    onSuccess: invalidate,
    gcTime: 0,
  })
  return { save, remove }
}
