import { z } from 'zod'
import {
  calendarDateSchema,
  choiceError,
  required,
  state,
  uniqueIds,
} from '../../schemas/academic-common'

export const MAX_PROFESSORS = 3
export const weekDays = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
] as const
export const academicConditions = [
  'CURSANDO',
  'REGULAR',
  'LIBRE',
  'PROMOCIONADO',
  'APROBADO',
  'DESAPROBADO',
] as const
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Ingresá una hora válida (HH:mm).')

export const horarioSchema = z
  .object({
    // Identidad estable del horario; la API debe validar también su pertenencia.
    id: required,
    diaSemana: z
      .number({ invalid_type_error: 'Elegí un día de la semana.' })
      .int('Elegí un día de la semana.')
      .min(1, 'Elegí un día de la semana.')
      .max(7, 'Elegí un día de la semana.'),
    horaInicio: timeSchema,
    horaFin: timeSchema,
    aulaId: required,
  })
  .refine((value) => value.horaInicio < value.horaFin, {
    path: ['horaFin'],
    message: 'La hora de fin debe ser posterior al inicio.',
  })
export type HorarioInput = z.infer<typeof horarioSchema>
export type HorarioCursada = HorarioInput & { cursadaId: string }
export interface ProfesorCursada {
  profesorId: string
  cursadaId: string
}

export function horariosOverlap(
  first: HorarioInput,
  second: HorarioInput,
): boolean {
  return (
    first.diaSemana === second.diaSemana &&
    first.horaInicio < second.horaFin &&
    second.horaInicio < first.horaFin
  )
}
export const cursadaSchema = z
  .object({
    materiaId: required,
    comisionId: required,
    periodoAcademicoId: required,
    profesorIds: uniqueIds.refine(
      (ids) => ids.length <= MAX_PROFESSORS,
      `Una cursada admite como máximo ${MAX_PROFESSORS} profesores.`,
    ),
    horarios: z
      .array(horarioSchema)
      .min(1, 'Agregá al menos un horario semanal.'),
    estado: state,
  })
  .superRefine((value, context) => {
    const ids = new Set<string>()
    value.horarios.forEach((horario, index) => {
      if (ids.has(horario.id))
        context.addIssue({
          code: 'custom',
          path: ['horarios', index, 'id'],
          message: 'No repitas la identidad de un horario.',
        })
      ids.add(horario.id)
      if (
        value.horarios
          .slice(0, index)
          .some((previous) => horariosOverlap(previous, horario))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['horarios', index, 'horaInicio'],
          message: 'Este horario se superpone con otro de la misma cursada.',
        })
      }
    })
  })
export const inscripcionSchema = z.object({
  alumnoId: required,
  cursadaId: required,
  fechaInscripcion: calendarDateSchema,
  estado: state,
  condicionAcademica: z.enum(academicConditions, choiceError),
})
