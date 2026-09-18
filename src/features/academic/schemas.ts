import { z } from 'zod'
import {
  calendarDateSchema,
  choiceError,
  required,
  state,
  uniqueIds,
} from '../../schemas/academic-common'
import { cursadaSchema, inscripcionSchema } from '../cursadas/schemas'
import {
  asistenciaSchema,
  evaluacionSchema,
  resultadoSchema,
  cuotaSchema,
  rfidSchema,
} from '../gestion/schemas'
export { calendarDateSchema } from '../../schemas/academic-common'

const identifier = required.regex(
  /^[\p{L}\p{N}._/-]+$/u,
  'Usá letras, números, puntos, guiones o barras.',
)
const description = z.string().trim().max(2000, 'Máximo 2000 caracteres.')
const address = required
function integerBetween(min: number, max: number) {
  return z
    .number({
      required_error: 'Este campo es obligatorio.',
      invalid_type_error: 'Ingresá un número válido.',
    })
    .int('Ingresá un número entero.')
    .min(min, `El valor mínimo es ${min}.`)
    .max(max, `El valor máximo es ${max}.`)
}
const year = integerBetween(1900, 2200)
const semester = integerBetween(1, 2)
const personFields = {
  nombre: required,
  apellido: required,
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, 'Ingresá un DNI de 7 u 8 dígitos, sin puntos.'),
  legajo: identifier,
  rfid: rfidSchema,
  email: z
    .string()
    .trim()
    .email('Ingresá un email válido.')
    .max(254, 'Máximo 254 caracteres.'),
  telefono: z
    .string()
    .trim()
    .regex(
      /^\+?[\d\s()-]{6,25}$/,
      'Ingresá un teléfono válido (6 a 25 caracteres).',
    ),
  estado: state,
}

export const inputSchemas = {
  sedes: z.object({ nombre: required, direccion: address, estado: state }),
  edificios: z.object({ nombre: required, sedeId: required, estado: state }),
  aulas: z.object({
    numero: identifier,
    capacidadMaxima: z
      .number({ invalid_type_error: 'Ingresá una capacidad válida.' })
      .int('La capacidad debe ser entera.')
      .positive('La capacidad debe ser mayor a cero.')
      .max(10000, 'La capacidad máxima es 10000.'),
    sedeId: required,
    edificioId: required,
    estado: z.enum(['ACTIVA', 'INACTIVA'], choiceError),
  }),
  carreras: z.object({
    codigo: identifier,
    nombre: required,
    descripcion: description,
    estado: state,
  }),
  'planes-estudio': z.object({
    codigo: identifier,
    nombre: required,
    carreraId: required,
    anioVigencia: year,
    estado: state,
  }),
  materias: z.object({
    codigo: identifier,
    nombre: required,
    descripcion: description,
    anio: integerBetween(1, 10),
    cuatrimestre: semester,
    tipo: z.enum(['OBLIGATORIA', 'ELECTIVA'], choiceError),
    planEstudioIds: uniqueIds.refine(
      (ids) => ids.length > 0,
      'Seleccioná al menos un plan de estudio.',
    ),
    correlativaIds: uniqueIds,
    estado: state,
  }),
  'periodos-academicos': z
    .object({
      anio: year,
      cuatrimestre: semester,
      fechaInicio: calendarDateSchema,
      fechaFin: calendarDateSchema,
      estado: state,
    })
    .refine((value) => value.fechaInicio < value.fechaFin, {
      path: ['fechaFin'],
      message: 'La fecha de fin debe ser posterior al inicio.',
    })
    .refine(
      (value) =>
        [value.fechaInicio, value.fechaFin].every(
          (date) => Number(date.slice(0, 4)) === value.anio,
        ),
      {
        path: ['anio'],
        message: 'Las fechas deben pertenecer al año del período.',
      },
    ),
  comisiones: z.object({ nombre: required, estado: state }),
  alumnos: z
    .object({
      ...personFields,
      fechaNacimiento: calendarDateSchema.refine(
        (date) =>
          date <
          new Date().toLocaleDateString('sv-SE', {
            timeZone: 'America/Argentina/Cordoba',
          }),
        'El nacimiento debe ser anterior a hoy.',
      ),
      direccion: address,
      carreraId: required,
      planEstudioId: required,
      fechaIngreso: calendarDateSchema,
    })
    .refine((value) => value.fechaNacimiento < value.fechaIngreso, {
      path: ['fechaIngreso'],
      message: 'El ingreso debe ser posterior al nacimiento.',
    }),
  profesores: z.object({ ...personFields, cargo: required }),
  cursadas: cursadaSchema,
  inscripciones: inscripcionSchema,
  asistencia: asistenciaSchema,
  evaluaciones: evaluacionSchema,
  resultados: resultadoSchema,
  cuotas: cuotaSchema,
} as const

export type AcademicDomain = keyof typeof inputSchemas
export type InputByDomain = {
  [D in AcademicDomain]: z.infer<(typeof inputSchemas)[D]>
}
export type AcademicInput = InputByDomain[AcademicDomain]
type KeysOfUnion<T> = T extends unknown ? keyof T : never
// Los horarios se editan como colección anidada, no como campo escalar de tabla.
export type AcademicField = Exclude<KeysOfUnion<AcademicInput>, 'horarios'>

export const auditSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})
export type AcademicRecord<D extends AcademicDomain = AcademicDomain> =
  InputByDomain[D] & z.infer<typeof auditSchema>
export type Sede = AcademicRecord<'sedes'>
export type Edificio = AcademicRecord<'edificios'>
export type Aula = AcademicRecord<'aulas'>
export type Carrera = AcademicRecord<'carreras'>
export type PlanEstudio = AcademicRecord<'planes-estudio'>
export type Materia = AcademicRecord<'materias'>
export type PeriodoAcademico = AcademicRecord<'periodos-academicos'>
export type Comision = AcademicRecord<'comisiones'>
export type Alumno = AcademicRecord<'alumnos'>
export type Profesor = AcademicRecord<'profesores'>
export type Cursada = AcademicRecord<'cursadas'>
export type InscripcionMateria = AcademicRecord<'inscripciones'>
export type Asistencia = AcademicRecord<'asistencia'>
export type Evaluacion = AcademicRecord<'evaluaciones'>
export type ResultadoEvaluacion = AcademicRecord<'resultados'>
export type Cuota = AcademicRecord<'cuotas'>

export const academicDomains = Object.keys(inputSchemas) as AcademicDomain[]
export function isAcademicDomain(value: string): value is AcademicDomain {
  return Object.hasOwn(inputSchemas, value)
}

// La clave del registro determina el schema y el tipo, también en el límite HTTP.
const typedInputSchemas: {
  [D in AcademicDomain]: z.ZodType<InputByDomain[D]>
} = inputSchemas
export function inputSchemaFor<D extends AcademicDomain>(
  domain: D,
): z.ZodType<InputByDomain[D]> {
  return typedInputSchemas[domain]
}
export function recordSchemaFor<D extends AcademicDomain>(
  domain: D,
): z.ZodType<AcademicRecord<D>> {
  return inputSchemaFor(domain).and(auditSchema)
}
export function fieldValue(
  record: AcademicInput,
  key: AcademicField,
): string | number | string[] | undefined {
  return (
    record as Partial<Record<AcademicField, string | number | string[]>>
  )[key]
}
