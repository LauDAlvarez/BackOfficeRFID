import { describe, expect, it } from 'vitest'
import { createAcademicData } from '../../mocks/academic-data'
import {
  cursadaSchema,
  horarioSchema,
  inscripcionSchema,
  academicConditions,
} from './schemas'
import {
  activeEnrollmentCount,
  courseCapacity,
  cursadaIssues,
  inscripcionIssues,
} from './rules'

describe('Reglas de cursadas, horarios e inscripciones', () => {
  const data = createAcademicData()
  const course = data.cursadas[0]!
  const horario = course.horarios[0]!
  it('permite hasta tres profesores distintos, o dejar la asignación pendiente', () => {
    expect(
      cursadaSchema.safeParse({ ...course, profesorIds: [] }).success,
    ).toBe(true)
    expect(
      cursadaSchema.safeParse({ ...course, profesorIds: ['1', '2', '3'] })
        .success,
    ).toBe(true)
    expect(
      cursadaSchema.safeParse({ ...course, profesorIds: ['1', '2', '3', '4'] })
        .success,
    ).toBe(false)
    expect(
      cursadaSchema.safeParse({ ...course, profesorIds: ['1', '1'] }).success,
    ).toBe(false)
  })
  it.each([
    { horaInicio: '20:00', horaFin: '18:00' },
    { horaInicio: '18:00', horaFin: '18:00' },
    { horaInicio: '8:00' },
    { horaInicio: '24:00' },
    { horaFin: '20:60' },
    { diaSemana: 0 },
    { diaSemana: 8 },
    { diaSemana: 1.5 },
    { aulaId: '' },
  ])('rechaza el horario inválido %j', (change) => {
    expect(horarioSchema.safeParse({ ...horario, ...change }).success).toBe(
      false,
    )
  })
  it('exige horarios y rechaza solapamientos incluso en aulas distintas, permitiendo bloques consecutivos', () => {
    expect(cursadaSchema.safeParse({ ...course, horarios: [] }).success).toBe(
      false,
    )
    const overlapping = {
      ...horario,
      id: 'otro',
      horaInicio: '19:00',
      aulaId: 'aula-301',
    }
    expect(
      cursadaSchema.safeParse({ ...course, horarios: [horario, overlapping] })
        .success,
    ).toBe(false)
    expect(
      cursadaSchema.safeParse({
        ...course,
        horarios: [
          horario,
          { ...overlapping, horaInicio: '20:00', horaFin: '22:00' },
        ],
      }).success,
    ).toBe(true)
    expect(
      cursadaSchema.safeParse({
        ...course,
        horarios: [horario, { ...overlapping, diaSemana: 7 }],
      }).success,
    ).toBe(true)
    expect(
      cursadaSchema.safeParse({
        ...course,
        horarios: [horario, { ...horario, diaSemana: 7 }],
      }).success,
    ).toBe(false)
  })
  it('deriva la capacidad del aula más pequeña, sin duplicarla como campo de la cursada', () => {
    expect(courseCapacity(course, data)).toBe(25)
    expect(courseCapacity({ horarios: [] }, data)).toBeNull()
    expect(
      courseCapacity({ horarios: [{ ...horario, aulaId: 'no-existe' }] }, data),
    ).toBeNull()
    expect(activeEnrollmentCount(course.id, data)).toBe(2)
    expect(activeEnrollmentCount(course.id, data, 'inscripcion-1')).toBe(1)
  })
  it('solo cuenta inscripciones activas y conserva la condición académica por separado', () => {
    const snapshot = createAcademicData()
    snapshot.inscripciones[0]!.condicionAcademica = 'APROBADO'
    expect(activeEnrollmentCount(course.id, snapshot)).toBe(2)
    snapshot.inscripciones[0]!.estado = 'INACTIVO'
    expect(activeEnrollmentCount(course.id, snapshot)).toBe(1)
    snapshot.inscripciones[1]!.deletedAt = new Date().toISOString()
    expect(activeEnrollmentCount(course.id, snapshot)).toBe(0)
    for (const condition of academicConditions)
      expect(
        inscripcionSchema.safeParse({
          ...data.inscripciones[0],
          condicionAcademica: condition,
        }).success,
      ).toBe(true)
    expect(
      inscripcionSchema.safeParse({
        ...data.inscripciones[0],
        condicionAcademica: 'OTRA',
      }).success,
    ).toBe(false)
  })
  it('señala el aula concreta con capacidad insuficiente y las asignaciones inactivas', () => {
    const snapshot = createAcademicData()
    snapshot.aulas[1]!.capacidadMaxima = 1
    expect(cursadaIssues(course, snapshot, course.id)).toContainEqual(
      expect.objectContaining({
        path: ['horarios', 1, 'aulaId'],
        message: expect.stringContaining('2 inscripciones'),
      }),
    )
    snapshot.aulas[1]!.estado = 'INACTIVA'
    expect(cursadaIssues(course, snapshot, course.id)).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('aulas activas'),
      }),
    )
    snapshot.profesores[0]!.estado = 'INACTIVO'
    expect(cursadaIssues(course, snapshot, course.id)).toContainEqual(
      expect.objectContaining({ field: 'profesorIds' }),
    )
  })
  it('valida el plan del alumno y la pertenencia de los horarios', () => {
    const snapshot = createAcademicData()
    snapshot.cursadas[0]!.materiaId = 'materia-mat2'
    expect(
      inscripcionIssues(snapshot.inscripciones[1]!, snapshot, 'inscripcion-2'),
    ).toContainEqual(
      expect.objectContaining({
        field: 'alumnoId',
        message: expect.stringContaining('plan de estudio'),
      }),
    )
    expect(
      cursadaIssues(
        { ...course, horarios: [snapshot.cursadas[1]!.horarios[0]!] },
        snapshot,
        course.id,
      ),
    ).toContainEqual(
      expect.objectContaining({
        message: 'El horario pertenece a otra cursada.',
      }),
    )
  })
})
