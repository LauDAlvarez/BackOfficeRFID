import type { DomainDefinition, FieldDefinition } from '../academic/catalog'
import type { InputByDomain } from '../academic/schemas'
import {
  attendanceStates,
  evaluationTypes,
  feeStates,
  resultStates,
} from './schemas'

export const choiceLabel = (value: string) =>
  value === 'RFID'
    ? 'RFID'
    : value.charAt(0) +
      value.slice(1).toLocaleLowerCase('es-AR').replaceAll('_', ' ')
const choices = (values: readonly string[]) =>
  values.map((value) => ({ value, label: choiceLabel(value) }))
const alumno: FieldDefinition = {
  name: 'alumnoId',
  label: 'Alumno',
  type: 'select',
  relation: 'alumnos',
}
const cursada: FieldDefinition = {
  name: 'cursadaId',
  label: 'Cursada',
  type: 'select',
  relation: 'cursadas',
}
const fecha: FieldDefinition = { name: 'fecha', label: 'Fecha', type: 'date' }
const courseLookups = [
  'materias',
  'comisiones',
  'periodos-academicos',
  'cursadas',
  'inscripciones',
] as const
export const gestionCatalog = {
  asistencia: {
    singular: 'asistencia',
    fields: [
      cursada,
      alumno,
      fecha,
      {
        name: 'horarioCursadaId',
        label: 'Horario de clase',
        type: 'select',
        dependsOn: 'cursadaId',
      },
      {
        name: 'estado',
        label: 'Estado',
        type: 'select',
        choices: choices(attendanceStates),
      },
      {
        name: 'origen',
        label: 'Origen',
        choices: choices(['MANUAL', 'RFID']),
        readOnly: true,
      },
    ],
    columns: [
      'fecha',
      'alumnoId',
      'cursadaId',
      'horarioCursadaId',
      'estado',
      'origen',
    ],
    filters: ['cursadaId', 'alumnoId', 'fecha', 'origen'],
    lookupDomains: [...courseLookups, 'aulas', 'asistencia'],
  },
  evaluaciones: {
    singular: 'evaluación',
    fields: [
      cursada,
      {
        name: 'tipo',
        label: 'Tipo',
        type: 'select',
        choices: choices(evaluationTypes),
      },
      { name: 'nombre', label: 'Nombre' },
      fecha,
      {
        name: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        optional: true,
      },
      {
        name: 'estado',
        label: 'Estado',
        type: 'select',
        choices: choices(['ACTIVO', 'INACTIVO']),
      },
    ],
    columns: ['fecha', 'nombre', 'cursadaId', 'tipo', 'estado'],
    filters: ['cursadaId', 'tipo', 'fecha'],
    lookupDomains: [...courseLookups],
  },
  resultados: {
    singular: 'resultado',
    fields: [
      {
        name: 'evaluacionId',
        label: 'Evaluación',
        type: 'select',
        relation: 'evaluaciones',
      },
      alumno,
      { name: 'nota', label: 'Nota (0 a 10)', type: 'number', step: 0.01 },
      {
        name: 'estado',
        label: 'Estado',
        choices: choices(resultStates),
        readOnly: true,
      },
      {
        name: 'observaciones',
        label: 'Observaciones',
        type: 'textarea',
        optional: true,
      },
    ],
    columns: ['evaluacionId', 'alumnoId', 'nota', 'estado'],
    filters: ['evaluacionId', 'alumnoId'],
    lookupDomains: [...courseLookups, 'resultados'],
  },
  cuotas: {
    singular: 'cuota',
    fields: [
      alumno,
      { name: 'anio', label: 'Año', type: 'number' },
      { name: 'mes', label: 'Mes', type: 'number' },
      { name: 'importe', label: 'Importe (ARS)', type: 'number', step: 0.01 },
      {
        name: 'fechaVencimiento',
        label: 'Fecha de vencimiento',
        type: 'date',
      },
      {
        name: 'fechaPago',
        label: 'Fecha de pago',
        type: 'date',
        optional: true,
      },
      {
        name: 'estado',
        label: 'Estado',
        choices: choices(feeStates),
        readOnly: true,
      },
    ],
    columns: [
      'alumnoId',
      'anio',
      'mes',
      'importe',
      'fechaVencimiento',
      'fechaPago',
      'estado',
    ],
    filters: ['alumnoId', 'anio', 'mes'],
    lookupDomains: ['cuotas'],
  },
} satisfies Record<
  'asistencia' | 'evaluaciones' | 'resultados' | 'cuotas',
  DomainDefinition
>
export const gestionInitialInputs = {
  asistencia: {
    alumnoId: '',
    cursadaId: '',
    fecha: '',
    horarioCursadaId: '',
    estado: 'PRESENTE',
    origen: 'MANUAL',
  },
  evaluaciones: {
    cursadaId: '',
    tipo: 'PARCIAL',
    nombre: '',
    fecha: '',
    descripcion: '',
    estado: 'ACTIVO',
  },
  resultados: {
    evaluacionId: '',
    alumnoId: '',
    nota: 0,
    estado: 'DESAPROBADO',
    observaciones: '',
  },
  cuotas: {
    alumnoId: '',
    anio: new Date().getFullYear(),
    mes: 1,
    importe: 0,
    fechaVencimiento: '',
    fechaPago: '',
    estado: 'PENDIENTE',
  },
} satisfies Pick<
  InputByDomain,
  'asistencia' | 'evaluaciones' | 'resultados' | 'cuotas'
>
