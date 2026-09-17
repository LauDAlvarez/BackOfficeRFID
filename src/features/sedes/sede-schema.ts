import { z } from 'zod'

// Contrato mínimo de lectura usado para comprobar la foundation; el CRUD es Fase 3.
export const sedeSummarySchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  direccion: z.string(),
  estado: z.enum(['ACTIVO', 'INACTIVO']),
})

export const sedesResponseSchema = z.object({
  data: z.array(sedeSummarySchema),
})
export type SedeSummary = z.infer<typeof sedeSummarySchema>
