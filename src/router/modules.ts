import type { IconName } from '../components/ui/Icon'
import type { Permission } from '../features/auth/permissions'

export const moduleGroups = [
  {
    id: 'personas',
    label: 'Personas',
    description: 'La comunidad de la facultad.',
    icon: 'people',
  },
  {
    id: 'academica',
    label: 'Organización académica',
    description: 'La estructura y el desarrollo de las carreras.',
    icon: 'book',
  },
  {
    id: 'espacios',
    label: 'Espacios',
    description: 'Los lugares donde se enseña y aprende.',
    icon: 'building',
  },
  {
    id: 'gestion',
    label: 'Administración',
    description: 'El seguimiento y la gestión institucional.',
    icon: 'clipboard',
  },
] as const satisfies readonly {
  id: string
  label: string
  description: string
  icon: IconName
}[]

export interface AppModule {
  permission?: Permission
  path: string
  label: string
  description: string
  group: (typeof moduleGroups)[number]['id']
  icon: IconName
}

export const modules = [
  {
    path: '/alumnos',
    label: 'Alumnos',
    description: 'Legajos y datos de los estudiantes.',
    group: 'personas',
    icon: 'people',
  },
  {
    path: '/profesores',
    label: 'Profesores',
    description: 'Información del equipo docente.',
    group: 'personas',
    icon: 'people',
  },
  {
    path: '/carreras',
    label: 'Carreras',
    description: 'Oferta académica de la facultad.',
    group: 'academica',
    icon: 'book',
  },
  {
    path: '/planes-estudio',
    label: 'Planes de estudio',
    description: 'Organización de cada propuesta formativa.',
    group: 'academica',
    icon: 'book',
  },
  {
    path: '/materias',
    label: 'Materias',
    description: 'Asignaturas y contenidos curriculares.',
    group: 'academica',
    icon: 'book',
  },
  {
    path: '/periodos-academicos',
    label: 'Períodos académicos',
    description: 'Calendario y cuatrimestres de cursado.',
    group: 'academica',
    icon: 'calendar',
  },
  {
    path: '/comisiones',
    label: 'Comisiones',
    description: 'Grupos de organización de las cursadas.',
    group: 'academica',
    icon: 'people',
  },
  {
    path: '/cursadas',
    label: 'Cursadas',
    description: 'Materias, docentes y horarios de cada período.',
    group: 'academica',
    icon: 'calendar',
  },
  {
    path: '/sedes',
    label: 'Sedes',
    description: 'Ubicaciones de la institución.',
    group: 'espacios',
    icon: 'building',
  },
  {
    path: '/edificios',
    label: 'Edificios',
    description: 'Edificios que integran cada sede.',
    group: 'espacios',
    icon: 'building',
  },
  {
    path: '/aulas',
    label: 'Aulas',
    description: 'Espacios físicos para el dictado de clases.',
    group: 'espacios',
    icon: 'building',
  },
  {
    path: '/inscripciones',
    label: 'Inscripciones',
    description: 'Vínculo de los alumnos con sus cursadas.',
    group: 'gestion',
    icon: 'clipboard',
  },
  {
    path: '/asistencia',
    label: 'Asistencia',
    description: 'Seguimiento de la asistencia a clases.',
    group: 'gestion',
    icon: 'clipboard',
  },
  {
    path: '/evaluaciones',
    label: 'Evaluaciones',
    description: 'Instancias de evaluación y resultados.',
    group: 'gestion',
    icon: 'clipboard',
  },
  {
    path: '/cuotas',
    label: 'Cuotas',
    description: 'Consulta de cuotas y pagos de los alumnos.',
    group: 'gestion',
    icon: 'wallet',
  },
  {
    path: '/resultados',
    label: 'Resultados',
    description: 'Notas y aprobación de las evaluaciones.',
    group: 'gestion',
    icon: 'clipboard',
  },
  {
    path: '/rfid',
    label: 'RFID',
    description: 'Asociación de tarjetas con alumnos y profesores.',
    group: 'personas',
    icon: 'people',
  },
  {
    path: '/usuarios',
    permission: 'manageUsers',
    label: 'Usuarios administrativos',
    description: 'Personal administrativo y acceso al sistema.',
    group: 'gestion',
    icon: 'shield',
  },
] as const satisfies readonly AppModule[]
