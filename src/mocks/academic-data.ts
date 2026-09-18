import type {
  AcademicDomain,
  AcademicRecord,
  InputByDomain,
} from '../features/academic/schemas'

export type AcademicDatabase = { [D in AcademicDomain]: AcademicRecord<D>[] }
function seed<D extends AcademicDomain>(
  id: string,
  input: InputByDomain[D],
): AcademicRecord<D> {
  return {
    ...input,
    id,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
    deletedAt: null,
  }
}

// Datos ficticios. Cada carga del navegador crea una nueva base en memoria.
export function createAcademicData(): AcademicDatabase {
  return {
    asistencia: [
      seed<'asistencia'>('asistencia-1', {
        alumnoId: 'alumno-1',
        cursadaId: 'cursada-mat1-a',
        fecha: '2026-08-03',
        horarioCursadaId: 'horario-mat1-a-lun',
        estado: 'PRESENTE',
        origen: 'RFID',
      }),
      seed<'asistencia'>('asistencia-2', {
        alumnoId: 'alumno-2',
        cursadaId: 'cursada-mat1-a',
        fecha: '2026-08-03',
        horarioCursadaId: 'horario-mat1-a-lun',
        estado: 'AUSENTE',
        origen: 'MANUAL',
      }),
    ],
    evaluaciones: [
      seed<'evaluaciones'>('evaluacion-1', {
        cursadaId: 'cursada-mat1-a',
        tipo: 'PARCIAL',
        nombre: 'Primer parcial',
        fecha: '2026-08-10',
        descripcion: 'Evaluación de demostración.',
        estado: 'ACTIVO',
      }),
    ],
    resultados: [
      seed<'resultados'>('resultado-1', {
        evaluacionId: 'evaluacion-1',
        alumnoId: 'alumno-1',
        nota: 8,
        estado: 'APROBADO',
        observaciones: '',
      }),
    ],
    cuotas: [
      seed<'cuotas'>('cuota-1', {
        alumnoId: 'alumno-1',
        anio: 2026,
        mes: 8,
        importe: 45000,
        fechaVencimiento: '2026-08-10',
        fechaPago: '',
        estado: 'VENCIDA',
      }),
      seed<'cuotas'>('cuota-2', {
        alumnoId: 'alumno-1',
        anio: 2026,
        mes: 7,
        importe: 45000,
        fechaVencimiento: '2026-07-10',
        fechaPago: '2026-07-09',
        estado: 'PAGADA',
      }),
    ],
    cursadas: [
      seed<'cursadas'>('cursada-mat1-a', {
        materiaId: 'materia-mat1',
        comisionId: 'comision-a',
        periodoAcademicoId: 'periodo-2026-2',
        profesorIds: ['profesor-1', 'profesor-2'],
        estado: 'ACTIVO',
        horarios: [
          {
            id: 'horario-mat1-a-lun',
            diaSemana: 1,
            horaInicio: '18:00',
            horaFin: '20:00',
            aulaId: 'aula-204',
          },
          {
            id: 'horario-mat1-a-mie',
            diaSemana: 3,
            horaInicio: '18:00',
            horaFin: '20:00',
            aulaId: 'aula-301',
          },
        ],
      }),
      seed<'cursadas'>('cursada-mat1-b', {
        materiaId: 'materia-mat1',
        comisionId: 'comision-b',
        periodoAcademicoId: 'periodo-2026-2',
        profesorIds: ['profesor-1'],
        estado: 'ACTIVO',
        horarios: [
          {
            id: 'horario-mat1-b-mar',
            diaSemana: 2,
            horaInicio: '16:00',
            horaFin: '18:00',
            aulaId: 'aula-204',
          },
        ],
      }),
    ],
    inscripciones: [
      seed<'inscripciones'>('inscripcion-1', {
        alumnoId: 'alumno-1',
        cursadaId: 'cursada-mat1-a',
        fechaInscripcion: '2026-07-20',
        estado: 'ACTIVO',
        condicionAcademica: 'CURSANDO',
      }),
      seed<'inscripciones'>('inscripcion-2', {
        alumnoId: 'alumno-2',
        cursadaId: 'cursada-mat1-a',
        fechaInscripcion: '2026-07-21',
        estado: 'ACTIVO',
        condicionAcademica: 'REGULAR',
      }),
    ],
    sedes: [
      seed<'sedes'>('sede-central', {
        nombre: 'Sede Central',
        direccion: 'Av. Universidad 100 · Córdoba (demo)',
        estado: 'ACTIVO',
      }),
      seed<'sedes'>('sede-norte', {
        nombre: 'Sede Norte',
        direccion: 'Calle del Campus 200 · Córdoba (demo)',
        estado: 'ACTIVO',
      }),
    ],
    edificios: [
      seed<'edificios'>('edificio-central', {
        nombre: 'Edificio Académico',
        sedeId: 'sede-central',
        estado: 'ACTIVO',
      }),
      seed<'edificios'>('edificio-norte', {
        nombre: 'Pabellón Norte',
        sedeId: 'sede-norte',
        estado: 'ACTIVO',
      }),
    ],
    aulas: [
      seed<'aulas'>('aula-204', {
        numero: '204',
        capacidadMaxima: 40,
        edificioId: 'edificio-central',
        sedeId: 'sede-central',
        estado: 'ACTIVA',
      }),
      seed<'aulas'>('aula-301', {
        numero: '301',
        capacidadMaxima: 25,
        edificioId: 'edificio-norte',
        sedeId: 'sede-norte',
        estado: 'ACTIVA',
      }),
    ],
    carreras: [
      seed<'carreras'>('carrera-sistemas', {
        codigo: 'SIS',
        nombre: 'Licenciatura en Sistemas',
        descripcion: 'Propuesta académica de demostración.',
        estado: 'ACTIVO',
      }),
      seed<'carreras'>('carrera-administracion', {
        codigo: 'ADM',
        nombre: 'Licenciatura en Administración',
        descripcion: '',
        estado: 'ACTIVO',
      }),
    ],
    'planes-estudio': [
      seed<'planes-estudio'>('plan-sis-2026', {
        codigo: 'SIS-2026',
        nombre: 'Plan Sistemas 2026',
        carreraId: 'carrera-sistemas',
        anioVigencia: 2026,
        estado: 'ACTIVO',
      }),
      seed<'planes-estudio'>('plan-adm-2026', {
        codigo: 'ADM-2026',
        nombre: 'Plan Administración 2026',
        carreraId: 'carrera-administracion',
        anioVigencia: 2026,
        estado: 'ACTIVO',
      }),
    ],
    materias: [
      seed<'materias'>('materia-mat1', {
        codigo: 'MAT1',
        nombre: 'Matemática I',
        descripcion: 'Fundamentos de matemática.',
        anio: 1,
        cuatrimestre: 1,
        tipo: 'OBLIGATORIA',
        planEstudioIds: ['plan-sis-2026', 'plan-adm-2026'],
        correlativaIds: [],
        estado: 'ACTIVO',
      }),
      seed<'materias'>('materia-mat2', {
        codigo: 'MAT2',
        nombre: 'Matemática II',
        descripcion: '',
        anio: 1,
        cuatrimestre: 2,
        tipo: 'OBLIGATORIA',
        planEstudioIds: ['plan-sis-2026'],
        correlativaIds: ['materia-mat1'],
        estado: 'ACTIVO',
      }),
    ],
    'periodos-academicos': [
      seed<'periodos-academicos'>('periodo-2026-1', {
        anio: 2026,
        cuatrimestre: 1,
        fechaInicio: '2026-03-02',
        fechaFin: '2026-07-03',
        estado: 'INACTIVO',
      }),
      seed<'periodos-academicos'>('periodo-2026-2', {
        anio: 2026,
        cuatrimestre: 2,
        fechaInicio: '2026-08-03',
        fechaFin: '2026-12-04',
        estado: 'ACTIVO',
      }),
    ],
    comisiones: [
      seed<'comisiones'>('comision-a', { nombre: 'A', estado: 'ACTIVO' }),
      seed<'comisiones'>('comision-b', { nombre: 'B', estado: 'ACTIVO' }),
      seed<'comisiones'>('comision-noche', {
        nombre: 'Noche A',
        estado: 'INACTIVO',
      }),
    ],
    alumnos: [
      'Álvarez',
      'Benítez',
      'Cabrera',
      'Díaz',
      'Escobar',
      'Fernández',
      'García',
      'Herrera',
      'Ibarra',
      'Juárez',
      'López',
      'Martínez',
      'Núñez',
      'Pérez',
    ].map((apellido, index) =>
      seed<'alumnos'>(`alumno-${index + 1}`, {
        nombre: ['Ana', 'Bruno', 'Camila', 'Diego'][index % 4]!,
        apellido,
        dni: String(40000001 + index),
        legajo: `A-2026-${String(index + 1).padStart(3, '0')}`,
        rfid: `DEMO-A-${index + 1}`,
        email: `alumno${index + 1}@demo.facultad.test`,
        telefono: '3510000000',
        fechaNacimiento: '2002-05-12',
        direccion: `Calle Demo ${index + 1}`,
        carreraId: index % 2 ? 'carrera-administracion' : 'carrera-sistemas',
        planEstudioId: index % 2 ? 'plan-adm-2026' : 'plan-sis-2026',
        fechaIngreso: '2026-03-02',
        estado: index === 13 ? 'INACTIVO' : 'ACTIVO',
      }),
    ),
    profesores: [
      seed<'profesores'>('profesor-1', {
        nombre: 'Lucía',
        apellido: 'Torres',
        dni: '30000001',
        legajo: 'P-001',
        rfid: 'DEMO-P-1',
        email: 'profesor1@demo.facultad.test',
        telefono: '3510000001',
        cargo: 'Profesora titular',
        estado: 'ACTIVO',
      }),
      seed<'profesores'>('profesor-2', {
        nombre: 'Martín',
        apellido: 'Vega',
        dni: '30000002',
        legajo: 'P-002',
        rfid: 'DEMO-P-2',
        email: 'profesor2@demo.facultad.test',
        telefono: '3510000002',
        cargo: 'Profesor adjunto',
        estado: 'ACTIVO',
      }),
    ],
  }
}
