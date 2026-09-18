import { modules } from '../../router/modules'
import type {
  AcademicDomain,
  AcademicField,
  AcademicInput,
  AcademicRecord,
  InputByDomain,
} from './schemas'
import { fieldValue } from './schemas'
import { formatDate } from '../../utils/date'
import { academicConditions, MAX_PROFESSORS } from '../cursadas/schemas'
import { gestionCatalog, gestionInitialInputs } from '../gestion/catalog'
import { scheduleLabel } from '../gestion/presentation'

export interface Choice {
  value: string
  label: string
}
export interface FieldDefinition {
  name: AcademicField
  label: string
  type?:
    | 'text'
    | 'email'
    | 'tel'
    | 'date'
    | 'number'
    | 'textarea'
    | 'select'
    | 'multiple'
  choices?: Choice[]
  relation?: AcademicDomain
  dependsOn?: AcademicField
  relationParent?: AcademicField
  optional?: boolean
  maxSelections?: number
  readOnly?: boolean
  step?: number
}
export interface DomainDefinition {
  singular: string
  fields: FieldDefinition[]
  columns: AcademicField[]
  filters: AcademicField[]
  lookupDomains?: AcademicDomain[]
}
const name: FieldDefinition = { name: 'nombre', label: 'Nombre' }
const code: FieldDefinition = { name: 'codigo', label: 'Código' }
const description: FieldDefinition = {
  name: 'descripcion',
  label: 'Descripción',
  type: 'textarea',
  optional: true,
}
const state: FieldDefinition = {
  name: 'estado',
  label: 'Estado',
  type: 'select',
  choices: [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
  ],
}
const sede: FieldDefinition = {
  name: 'sedeId',
  label: 'Sede',
  type: 'select',
  relation: 'sedes',
}
const carrera: FieldDefinition = {
  name: 'carreraId',
  label: 'Carrera',
  type: 'select',
  relation: 'carreras',
}
const semester: FieldDefinition = {
  name: 'cuatrimestre',
  label: 'Cuatrimestre',
  type: 'select',
  choices: [
    { value: '1', label: '1.er cuatrimestre' },
    { value: '2', label: '2.º cuatrimestre' },
  ],
}
const people: FieldDefinition[] = [
  name,
  { name: 'apellido', label: 'Apellido' },
  { name: 'dni', label: 'DNI' },
  { name: 'legajo', label: 'Legajo' },
  { name: 'rfid', label: 'RFID' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'telefono', label: 'Teléfono', type: 'tel' },
]
export const catalog: Record<AcademicDomain, DomainDefinition> = {
  ...gestionCatalog,
  sedes: {
    singular: 'sede',
    fields: [name, { name: 'direccion', label: 'Dirección' }, state],
    columns: ['nombre', 'direccion', 'estado'],
    filters: [],
  },
  edificios: {
    singular: 'edificio',
    fields: [name, sede, state],
    columns: ['nombre', 'sedeId', 'estado'],
    filters: ['sedeId'],
  },
  aulas: {
    singular: 'aula',
    fields: [
      { name: 'numero', label: 'Número' },
      { name: 'capacidadMaxima', label: 'Capacidad máxima', type: 'number' },
      sede,
      {
        name: 'edificioId',
        label: 'Edificio',
        type: 'select',
        relation: 'edificios',
        dependsOn: 'sedeId',
        relationParent: 'sedeId',
      },
      {
        ...state,
        choices: [
          { value: 'ACTIVA', label: 'Activa' },
          { value: 'INACTIVA', label: 'Inactiva' },
        ],
      },
    ],
    columns: ['numero', 'capacidadMaxima', 'sedeId', 'edificioId', 'estado'],
    filters: ['sedeId', 'edificioId'],
  },
  carreras: {
    singular: 'carrera',
    fields: [code, name, description, state],
    columns: ['codigo', 'nombre', 'estado'],
    filters: [],
  },
  'planes-estudio': {
    singular: 'plan de estudio',
    fields: [
      code,
      name,
      carrera,
      { name: 'anioVigencia', label: 'Año de vigencia', type: 'number' },
      state,
    ],
    columns: ['codigo', 'nombre', 'carreraId', 'anioVigencia', 'estado'],
    filters: ['carreraId'],
  },
  materias: {
    singular: 'materia',
    fields: [
      code,
      name,
      description,
      { name: 'anio', label: 'Año de cursado', type: 'number' },
      semester,
      {
        name: 'tipo',
        label: 'Tipo',
        type: 'select',
        choices: [
          { value: 'OBLIGATORIA', label: 'Obligatoria' },
          { value: 'ELECTIVA', label: 'Electiva' },
        ],
      },
      {
        name: 'planEstudioIds',
        label: 'Planes de estudio',
        type: 'multiple',
        relation: 'planes-estudio',
      },
      {
        name: 'correlativaIds',
        label: 'Materias correlativas previas',
        type: 'multiple',
        relation: 'materias',
        optional: true,
      },
      state,
    ],
    columns: ['codigo', 'nombre', 'anio', 'cuatrimestre', 'tipo', 'estado'],
    filters: ['planEstudioIds', 'tipo'],
  },
  'periodos-academicos': {
    singular: 'período académico',
    fields: [
      { name: 'anio', label: 'Año', type: 'number' },
      semester,
      { name: 'fechaInicio', label: 'Fecha de inicio', type: 'date' },
      { name: 'fechaFin', label: 'Fecha de fin', type: 'date' },
      state,
    ],
    columns: ['anio', 'cuatrimestre', 'fechaInicio', 'fechaFin', 'estado'],
    filters: ['cuatrimestre'],
  },
  comisiones: {
    singular: 'comisión',
    fields: [name, state],
    columns: ['nombre', 'estado'],
    filters: [],
  },
  alumnos: {
    singular: 'alumno',
    fields: [
      ...people,
      { name: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date' },
      { name: 'direccion', label: 'Dirección' },
      carrera,
      {
        name: 'planEstudioId',
        label: 'Plan de estudio',
        type: 'select',
        relation: 'planes-estudio',
        dependsOn: 'carreraId',
        relationParent: 'carreraId',
      },
      { name: 'fechaIngreso', label: 'Fecha de ingreso', type: 'date' },
      state,
    ],
    columns: ['apellido', 'nombre', 'dni', 'legajo', 'carreraId', 'estado'],
    filters: ['carreraId', 'planEstudioId'],
    lookupDomains: ['cuotas'],
  },
  profesores: {
    singular: 'profesor',
    fields: [...people, { name: 'cargo', label: 'Cargo' }, state],
    columns: ['apellido', 'nombre', 'dni', 'legajo', 'cargo', 'estado'],
    filters: [],
  },
  cursadas: {
    singular: 'cursada',
    fields: [
      {
        name: 'materiaId',
        label: 'Materia',
        type: 'select',
        relation: 'materias',
      },
      {
        name: 'comisionId',
        label: 'Comisión',
        type: 'select',
        relation: 'comisiones',
      },
      {
        name: 'periodoAcademicoId',
        label: 'Período académico',
        type: 'select',
        relation: 'periodos-academicos',
      },
      {
        name: 'profesorIds',
        label: 'Profesores',
        type: 'multiple',
        relation: 'profesores',
        optional: true,
        maxSelections: MAX_PROFESSORS,
      },
      state,
    ],
    columns: [
      'materiaId',
      'comisionId',
      'periodoAcademicoId',
      'profesorIds',
      'estado',
    ],
    filters: ['periodoAcademicoId', 'materiaId', 'comisionId', 'profesorIds'],
    lookupDomains: [
      'aulas',
      'edificios',
      'sedes',
      'inscripciones',
      'cursadas',
    ],
  },
  inscripciones: {
    singular: 'inscripción',
    fields: [
      {
        name: 'alumnoId',
        label: 'Alumno',
        type: 'select',
        relation: 'alumnos',
      },
      {
        name: 'cursadaId',
        label: 'Cursada',
        type: 'select',
        relation: 'cursadas',
      },
      {
        name: 'fechaInscripcion',
        label: 'Fecha de inscripción',
        type: 'date',
      },
      {
        name: 'condicionAcademica',
        label: 'Condición académica',
        type: 'select',
        choices: academicConditions.map((condition) => ({
          value: condition,
          label:
            condition.charAt(0) +
            condition.slice(1).toLocaleLowerCase('es-AR'),
        })),
      },
      state,
    ],
    columns: [
      'alumnoId',
      'cursadaId',
      'fechaInscripcion',
      'condicionAcademica',
      'estado',
    ],
    filters: ['cursadaId', 'alumnoId', 'condicionAcademica'],
    lookupDomains: [
      'materias',
      'comisiones',
      'periodos-academicos',
      'aulas',
      'edificios',
      'sedes',
      'inscripciones',
    ],
  },
}
export type Lookups = Partial<Record<AcademicDomain, AcademicRecord[]>>
export function moduleFor(domain: AcademicDomain) {
  return modules.find((module) => module.path === `/${domain}`)!
}
export function recordLabel(
  record: AcademicRecord,
  lookups: Lookups = {},
): string {
  const relatedLabel = (domain: AcademicDomain, id: string) => {
    const related = lookups[domain]?.find((item) => item.id === id)
    return related ? recordLabel(related, lookups) : 'Registro no disponible'
  }
  if ('materiaId' in record)
    return `${relatedLabel('materias', record.materiaId)} · ${relatedLabel('comisiones', record.comisionId)} · ${relatedLabel('periodos-academicos', record.periodoAcademicoId)}`
  if ('horarioCursadaId' in record)
    return `${relatedLabel('alumnos', record.alumnoId)} · ${formatDate(record.fecha)}`
  if ('evaluacionId' in record)
    return `${relatedLabel('alumnos', record.alumnoId)} · ${relatedLabel('evaluaciones', record.evaluacionId)}`
  if ('importe' in record)
    return `${relatedLabel('alumnos', record.alumnoId)} · ${record.mes}/${record.anio}`
  if ('tipo' in record && 'cursadaId' in record)
    return `${record.nombre} · ${relatedLabel('cursadas', record.cursadaId)}`
  if ('alumnoId' in record && 'cursadaId' in record)
    return `${relatedLabel('alumnos', record.alumnoId)} · ${relatedLabel('cursadas', record.cursadaId)}`
  if ('apellido' in record)
    return `${record.apellido}, ${record.nombre} · ${record.legajo}`
  if ('nombre' in record)
    return 'codigo' in record
      ? `${record.codigo} · ${record.nombre}`
      : record.nombre
  if ('numero' in record) return `Aula ${record.numero}`
  return `${record.anio} · ${record.cuatrimestre}.º cuatrimestre`
}
export function displayValue(
  field: FieldDefinition,
  record: AcademicInput,
  lookups: Lookups,
): string {
  const value = fieldValue(record, field.name)
  if (field.name === 'horarioCursadaId' && 'cursadaId' in record)
    return scheduleLabel(record.cursadaId, String(value), lookups)
  if (field.name === 'importe' && typeof value === 'number')
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value)
  if (
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && !value.length)
  )
    return '—'
  if (field.relation) {
    const relation = field.relation
    return (Array.isArray(value) ? value : [String(value)])
      .map((id) => {
        const match = lookups[relation]?.find((item) => item.id === id)
        return match ? recordLabel(match, lookups) : 'Registro no disponible'
      })
      .join('; ')
  }
  if (field.type === 'date') return formatDate(String(value))
  return (
    field.choices?.find((choice) => choice.value === String(value))?.label ??
    String(value)
  )
}
export const initialInputs = {
  ...gestionInitialInputs,
  sedes: { nombre: '', direccion: '', estado: 'ACTIVO' },
  edificios: { nombre: '', sedeId: '', estado: 'ACTIVO' },
  aulas: {
    numero: '',
    capacidadMaxima: 30,
    sedeId: '',
    edificioId: '',
    estado: 'ACTIVA',
  },
  carreras: { codigo: '', nombre: '', descripcion: '', estado: 'ACTIVO' },
  'planes-estudio': {
    codigo: '',
    nombre: '',
    carreraId: '',
    anioVigencia: new Date().getFullYear(),
    estado: 'ACTIVO',
  },
  materias: {
    codigo: '',
    nombre: '',
    descripcion: '',
    anio: 1,
    cuatrimestre: 1,
    tipo: 'OBLIGATORIA',
    planEstudioIds: [],
    correlativaIds: [],
    estado: 'ACTIVO',
  },
  'periodos-academicos': {
    anio: new Date().getFullYear(),
    cuatrimestre: 1,
    fechaInicio: '',
    fechaFin: '',
    estado: 'ACTIVO',
  },
  comisiones: { nombre: '', estado: 'ACTIVO' },
  alumnos: {
    nombre: '',
    apellido: '',
    dni: '',
    legajo: '',
    rfid: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    direccion: '',
    carreraId: '',
    planEstudioId: '',
    fechaIngreso: '',
    estado: 'ACTIVO',
  },
  profesores: {
    nombre: '',
    apellido: '',
    dni: '',
    legajo: '',
    rfid: '',
    email: '',
    telefono: '',
    cargo: '',
    estado: 'ACTIVO',
  },
  cursadas: {
    materiaId: '',
    comisionId: '',
    periodoAcademicoId: '',
    profesorIds: [],
    horarios: [],
    estado: 'ACTIVO',
  },
  inscripciones: {
    alumnoId: '',
    cursadaId: '',
    fechaInscripcion: '',
    condicionAcademica: 'CURSANDO',
    estado: 'ACTIVO',
  },
} satisfies InputByDomain
