import { z } from 'zod'
import { apiClient } from '../lib/api-client'
import { ApiError } from '../lib/api-error'
import { recordSchemaFor } from '../features/academic/schemas'
import { rfidSchema } from '../features/gestion/schemas'

const personSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('ALUMNO'),
    persona: recordSchemaFor('alumnos'),
  }),
  z.object({
    tipo: z.literal('PROFESOR'),
    persona: recordSchemaFor('profesores'),
  }),
])
export type RfidPerson = z.infer<typeof personSchema>
export interface RfidService {
  findPerson(rfid: string, signal?: AbortSignal): Promise<RfidPerson | null>
}
export const httpRfidService: RfidService = {
  async findPerson(rfid, signal) {
    const response = await apiClient.get<unknown>(
      `/personas/por-rfid/${encodeURIComponent(rfidSchema.parse(rfid))}`,
      signal ? { signal } : {},
    )
    const parsed = z
      .object({ data: personSchema.nullable() })
      .safeParse(response.data)
    if (!parsed.success)
      throw new ApiError(
        'La respuesta del servidor no tiene el formato esperado.',
      )
    return parsed.data.data
  },
}
