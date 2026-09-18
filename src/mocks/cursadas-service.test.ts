import { describe, expect, it } from 'vitest'
import { createAcademicData as createFullAcademicData } from './academic-data'
import { createMockAcademicDatabase } from './academic-service'
import { defaultListParams } from '../features/academic/use-academic'

// Estos casos ejercitan ofertas sin historial; la Fase 5 verifica la protección del historial.
function createAcademicData() {
  return {
    ...createFullAcademicData(),
    asistencia: [],
    evaluaciones: [],
    resultados: [],
  }
}
function createCourseDatabase() {
  return createMockAcademicDatabase(createAcademicData())
}

function smallClassDatabase() {
  const data = createAcademicData()
  data.aulas[1]!.capacidadMaxima = 2
  return createMockAcademicDatabase(data)
}
describe('Integridad de cursadas e inscripciones en servicios mock', () => {
  it('rechaza el cuarto profesor y referencias inexistentes sin modificar la oferta', async () => {
    const database = createCourseDatabase()
    const service = database.service('cursadas')
    const course = await service.get('cursada-mat1-a')
    await expect(
      service.update(course.id, {
        ...course,
        profesorIds: ['1', '2', '3', '4'],
      }),
    ).rejects.toThrow('máximo 3')
    for (const field of [
      'materiaId',
      'comisionId',
      'periodoAcademicoId',
    ] as const)
      await expect(
        service.update(course.id, { ...course, [field]: 'ausente' }),
      ).rejects.toMatchObject({ status: 422 })
    await expect(
      service.update(course.id, { ...course, profesorIds: ['ausente'] }),
    ).rejects.toMatchObject({ status: 422 })
    await expect(
      service.update(course.id, {
        ...course,
        horarios: [{ ...course.horarios[0]!, aulaId: 'ausente' }],
      }),
    ).rejects.toMatchObject({ status: 422 })
    expect(await service.get(course.id)).toEqual(course)
  })
  it('permite múltiples cursadas de una materia y múltiples cursadas de un profesor', async () => {
    const service = createCourseDatabase().service('cursadas')
    const page = await service.list({
      ...defaultListParams('cursadas'),
      filters: {
        materiaId: 'materia-mat1',
        profesorIds: 'profesor-1',
        periodoAcademicoId: 'periodo-2026-2',
      },
    })
    expect(page.total).toBe(2)
    expect(
      (
        await service.list({
          ...defaultListParams('cursadas'),
          search: 'Matemática',
        })
      ).total,
    ).toBe(2)
    await expect(
      service.create({
        ...page.data[0]!,
        horarios: [{ ...page.data[0]!.horarios[0]!, id: 'nuevo' }],
      }),
    ).rejects.toMatchObject({ status: 409 })
  })
  it('impide duplicados al crear o reasignar, incluidos registros inactivos y bajas lógicas', async () => {
    const service = createCourseDatabase().service('inscripciones')
    const first = await service.get('inscripcion-1')
    await expect(service.create(first)).rejects.toMatchObject({ status: 409 })
    await expect(
      service.update('inscripcion-2', { ...first }),
    ).rejects.toMatchObject({ status: 409 })
    await service.update(first.id, { ...first, estado: 'INACTIVO' })
    await expect(service.create(first)).rejects.toMatchObject({ status: 409 })
    await service.softDelete(first.id)
    await expect(service.create(first)).rejects.toMatchObject({ status: 409 })
    expect(
      (
        await service.list({
          ...defaultListParams('inscripciones'),
          filters: { cursadaId: first.cursadaId },
        })
      ).total,
    ).toBe(1)
  })
  it('controla cupos en alta, edición, reactivación y liberación de una inscripción', async () => {
    const service = smallClassDatabase().service('inscripciones')
    const first = await service.get('inscripcion-1')
    await expect(
      service.create({ ...first, alumnoId: 'alumno-3' }),
    ).rejects.toThrow('cupo')
    const inactive = await service.create({
      ...first,
      alumnoId: 'alumno-3',
      estado: 'INACTIVO',
    })
    await expect(
      service.update(inactive.id, { ...inactive, estado: 'ACTIVO' }),
    ).rejects.toThrow('cupo')
    expect(
      await service.update(first.id, {
        ...first,
        condicionAcademica: 'PROMOCIONADO',
      }),
    ).toMatchObject({ condicionAcademica: 'PROMOCIONADO' })
    await service.softDelete(first.id)
    expect(
      await service.update(inactive.id, { ...inactive, estado: 'ACTIVO' }),
    ).toMatchObject({ estado: 'ACTIVO' })
  })
  it('no sobreasigna la última vacante ante dos altas simultáneas', async () => {
    const service = smallClassDatabase().service('inscripciones')
    const first = await service.get('inscripcion-1')
    await service.softDelete(first.id)
    const results = await Promise.allSettled([
      service.create({ ...first, alumnoId: 'alumno-3' }),
      service.create({ ...first, alumnoId: 'alumno-4' }),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1)
  })
  it('controla el cupo de destino al trasladar inscripciones y libera el de origen', async () => {
    const database = smallClassDatabase()
    const service = database.service('inscripciones')
    const first = await service.get('inscripcion-1')
    const other = await service.create({
      ...first,
      alumnoId: 'alumno-3',
      cursadaId: 'cursada-mat1-b',
    })
    await expect(
      service.update(other.id, { ...other, cursadaId: first.cursadaId }),
    ).rejects.toThrow('cupo')
    await service.update(first.id, { ...first, cursadaId: 'cursada-mat1-b' })
    expect(
      await service.update(other.id, {
        ...other,
        cursadaId: first.cursadaId,
      }),
    ).toMatchObject({ cursadaId: first.cursadaId })
  })
  it('impide reducir el aula, cambiar materia o desactivar referencias si invalida inscripciones', async () => {
    const database = smallClassDatabase()
    const course = await database.service('cursadas').get('cursada-mat1-a')
    const aula = await database.service('aulas').get('aula-301')
    await expect(
      database
        .service('aulas')
        .update(aula.id, { ...aula, capacidadMaxima: 1 }),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      database
        .service('aulas')
        .update(aula.id, { ...aula, estado: 'INACTIVA' }),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      database
        .service('cursadas')
        .update(course.id, { ...course, materiaId: 'materia-mat2' }),
    ).rejects.toThrow('plan de estudio')
    await expect(
      database
        .service('cursadas')
        .update(course.id, { ...course, estado: 'INACTIVO' }),
    ).rejects.toThrow('cursada activa')
    expect(await database.service('aulas').get(aula.id)).toEqual(aula)
    expect(await database.service('cursadas').get(course.id)).toEqual(course)
  })
  it('rechaza cambiar a un aula menor que los inscriptos y conserva las identidades de horarios al editar', async () => {
    const data = createAcademicData()
    data.aulas.push({
      ...data.aulas[0]!,
      id: 'aula-pequena',
      numero: '1',
      capacidadMaxima: 1,
    })
    const database = createMockAcademicDatabase(data)
    const service = database.service('cursadas')
    const course = await service.get('cursada-mat1-a')
    await expect(
      service.update(course.id, {
        ...course,
        horarios: [{ ...course.horarios[0]!, aulaId: 'aula-pequena' }],
      }),
    ).rejects.toThrow('2 inscripciones')
    await expect(
      service.update(course.id, {
        ...course,
        horarios: [(await service.get('cursada-mat1-b')).horarios[0]!],
      }),
    ).rejects.toThrow('otra cursada')
    const saved = await service.update(course.id, {
      ...course,
      horarios: course.horarios.map((row) => ({
        ...row,
        horaInicio: '17:00',
      })),
    })
    expect(saved.horarios.map((row) => row.id)).toEqual(
      course.horarios.map((row) => row.id),
    )
  })
  it('protege bajas de aula, profesor y cursada; libera la cursada al dar de baja sus inscripciones', async () => {
    const database = createCourseDatabase()
    await expect(
      database.service('aulas').softDelete('aula-204'),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      database.service('profesores').softDelete('profesor-1'),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      database.service('cursadas').softDelete('cursada-mat1-a'),
    ).rejects.toMatchObject({ status: 409 })
    await database.service('inscripciones').softDelete('inscripcion-1')
    await database.service('inscripciones').softDelete('inscripcion-2')
    await database.service('cursadas').softDelete('cursada-mat1-a')
    await expect(
      database.service('cursadas').get('cursada-mat1-a'),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      database.service('inscripciones').create({
        alumnoId: 'alumno-3',
        cursadaId: 'cursada-mat1-a',
        fechaInscripcion: '2026-08-01',
        estado: 'ACTIVO',
        condicionAcademica: 'CURSANDO',
      }),
    ).rejects.toMatchObject({ status: 422 })
  })
  it('conserva la pertenencia de un horario retirado mediante baja lógica', async () => {
    const service = createCourseDatabase().service('cursadas')
    const course = await service.get('cursada-mat1-a')
    const removed = course.horarios[1]!
    await service.update(course.id, {
      ...course,
      horarios: [course.horarios[0]!],
    })
    const other = await service.get('cursada-mat1-b')
    await expect(
      service.update(other.id, { ...other, horarios: [removed] }),
    ).rejects.toThrow('incluso si fue dado de baja')
  })
})
