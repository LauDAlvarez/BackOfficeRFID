import { env } from '../lib/env'
import {
  academicDomains,
  type AcademicDomain,
} from '../features/academic/schemas'
import {
  createHttpAcademicService,
  type AcademicService,
} from './academic-service'

export function createAcademicService<D extends AcademicDomain>(
  domain: D,
): AcademicService<D> {
  const http = createHttpAcademicService(domain)
  async function implementation(): Promise<AcademicService<D>> {
    if (env.useMocks)
      return (await import('../mocks/academic-service')).mockAcademicService(
        domain,
      )
    return http
  }
  return {
    list: async (params, signal) =>
      (await implementation()).list(params, signal),
    get: async (id, signal) => (await implementation()).get(id, signal),
    create: async (input) => (await implementation()).create(input),
    update: async (id, input) => (await implementation()).update(id, input),
    softDelete: async (id) => (await implementation()).softDelete(id),
  }
}

export const academicServices = Object.fromEntries(
  academicDomains.map((domain) => [domain, createAcademicService(domain)]),
) as Record<AcademicDomain, AcademicService<AcademicDomain>>
