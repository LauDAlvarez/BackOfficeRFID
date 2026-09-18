import { z } from 'zod'
import {
  calendarDateSchema,
  choiceError,
  required,
  state,
} from '../../schemas/academic-common'
import { todayInCordoba } from '../../utils/date'

export const MIN_PASSING_GRADE = 6
export const attendanceStates = [
  'PRESENTE',
  'AUSENTE',
  'JUSTIFICADO',
] as const
export const evaluationTypes = [
  'PARCIAL',
  'RECUPERATORIO',
  'TRABAJO_PRACTICO',
  'FINAL',
] as const
export const resultStates = ['APROBADO', 'DESAPROBADO'] as const
export const feeStates = ['PENDIENTE', 'PAGADA', 'VENCIDA'] as const
export function resultState(nota: number): (typeof resultStates)[number] {
  return nota >= MIN_PASSING_GRADE ? 'APROBADO' : 'DESAPROBADO'
}
export function feeState(
  cuota: { fechaVencimiento: string; fechaPago: string },
  today = todayInCordoba(),
): (typeof feeStates)[number] {
  return cuota.fechaPago
    ? 'PAGADA'
    : cuota.fechaVencimiento < today
      ? 'VENCIDA'
      : 'PENDIENTE'
}
const notes = z.string().trim().max(2000, 'Máximo 2000 caracteres.')
export const asistenciaSchema = z.object({
  alumnoId: required,
  cursadaId: required,
  fecha: calendarDateSchema.refine(
    (date) => date <= todayInCordoba(),
    'La asistencia no puede tener una fecha futura.',
  ),
  horarioCursadaId: required,
  estado: z.enum(attendanceStates, choiceError),
  origen: z.enum(['MANUAL', 'RFID'], choiceError),
})
export const evaluacionSchema = z.object({
  cursadaId: required,
  tipo: z.enum(evaluationTypes, choiceError),
  nombre: required,
  fecha: calendarDateSchema,
  descripcion: notes,
  estado: state,
})
export const resultadoSchema = z
  .object({
    evaluacionId: required,
    alumnoId: required,
    nota: z
      .number({ invalid_type_error: 'Ingresá una nota válida.' })
      .finite('Ingresá una nota finita.')
      .min(0, 'La nota mínima es 0.')
      .max(10, 'La nota máxima es 10.'),
    estado: z.enum(resultStates, choiceError),
    observaciones: notes,
  })
  .transform((value) => ({ ...value, estado: resultState(value.nota) }))
export const cuotaSchema = z
  .object({
    alumnoId: required,
    anio: z
      .number({
        required_error: 'Ingresá un año.',
        invalid_type_error: 'Ingresá un año válido.',
      })
      .int('Ingresá un año entero.')
      .min(1900, 'El año mínimo es 1900.')
      .max(2200, 'El año máximo es 2200.'),
    mes: z
      .number({
        required_error: 'Ingresá un mes.',
        invalid_type_error: 'Ingresá un mes válido.',
      })
      .int('Ingresá un mes entero.')
      .min(1, 'El mes mínimo es 1.')
      .max(12, 'El mes máximo es 12.'),
    importe: z
      .number({ invalid_type_error: 'Ingresá un importe válido.' })
      .finite('Ingresá un importe finito.')
      .positive('El importe debe ser mayor a cero.')
      .max(999999999, 'El importe es demasiado grande.')
      .refine(
        (amount) =>
          Math.abs(amount * 100 - Math.round(amount * 100)) < 0.00001,
        'Usá como máximo dos decimales.',
      ),
    fechaVencimiento: calendarDateSchema,
    fechaPago: z
      .union([z.literal(''), calendarDateSchema])
      .refine(
        (date) => !date || date <= todayInCordoba(),
        'El pago no puede tener una fecha futura.',
      ),
    estado: z.enum(feeStates, choiceError),
  })
  .transform((value) => ({ ...value, estado: feeState(value) }))

export const rfidSchema = required
  .regex(
    /^[\p{L}\p{N}._/-]+$/u,
    'Usá letras, números, puntos, guiones o barras.',
  )
  .transform((value) => value.toUpperCase())
export const rfidSearchSchema = z.object({ rfid: rfidSchema })
