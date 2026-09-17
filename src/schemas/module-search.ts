import { z } from 'zod'

export const moduleSearchSchema = z.object({
  search: z.string().trim().max(100, 'Ingresá hasta 100 caracteres.'),
})

export type ModuleSearchValues = z.infer<typeof moduleSearchSchema>
