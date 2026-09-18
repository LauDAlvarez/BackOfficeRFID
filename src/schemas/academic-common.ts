import { z } from 'zod'
import { formatDate } from '../utils/date'

export const required = z
  .string()
  .trim()
  .min(1, 'Este campo es obligatorio.')
  .max(150, 'Máximo 150 caracteres.')
export const choiceError = {
  errorMap: () => ({ message: 'Seleccioná una opción válida.' }),
}
export const state = z.enum(['ACTIVO', 'INACTIVO'], choiceError)
export const uniqueIds = z
  .array(required)
  .refine((ids) => new Set(ids).size === ids.length, 'No repitas relaciones.')
export const calendarDateSchema = z
  .string()
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && formatDate(value) !== '—',
    'Ingresá una fecha válida.',
  )
