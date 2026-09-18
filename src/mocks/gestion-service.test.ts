import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAcademicData } from './academic-data'
import { createMockAcademicDatabase } from './academic-service'
import { defaultListParams } from '../features/academic/use-academic'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-18T12:00:00Z'))
})
afterEach(() => vi.useRealTimers())
describe('Asistencia, evaluaciones y resultados en memoria', () => {
  it('corrige asistencia RFID conservando identidad, origen y auditoría de creación', async () => {
    const service = createMockAcademicDatabase().service('asistencia')
    const original = await service.get('asistencia-1')
    const saved = await service.update(original.id, {
      ...original,
      estado: 'JUSTIFICADO',
    })
    expect(saved).toMatchObject({
      id: original.id,
      origen: 'RFID',
      createdAt: original.createdAt,
      estado: 'JUSTIFICADO',
    })
    expect(saved.updatedAt).not.toBe(original.updatedAt)
    await expect(
      service.update(original.id, { ...saved, origen: 'MANUAL' }),
    ).rejects.toThrow('conserva el origen')
  })
  it('registra asistencia manual sin duplicados, permite varios horarios y aplica baja lógica', async () => {
    const service = createMockAcademicDatabase().service('asistencia')
    const original = await service.get('asistencia-1')
    const input = {
      ...original,
      fecha: '2026-08-05',
      horarioCursadaId: 'horario-mat1-a-mie',
      origen: 'MANUAL' as const,
    }
    const saved = await service.create(input)
    await expect(service.create(input)).rejects.toMatchObject({ status: 409 })
    await expect(
      service.create({ ...input, fecha: '2026-08-12', origen: 'RFID' }),
    ).rejects.toThrow('manual')
    const list = await service.list({
      ...defaultListParams('asistencia'),
      filters: { fecha: input.fecha, alumnoId: input.alumnoId },
    })
    expect(list.data.map((row) => row.id)).toEqual([saved.id])
    await service.softDelete(saved.id)
    await expect(service.get(saved.id)).rejects.toMatchObject({ status: 404 })
    await expect(service.create(input)).rejects.toMatchObject({ status: 409 })
  })
  it.each([
    { alumnoId: 'alumno-3' },
    { horarioCursadaId: 'horario-mat1-b-mar' },
    { fecha: '2026-08-04' },
    { fecha: '2026-07-06' },
    { cursadaId: 'inexistente' },
  ])('rechaza asistencia incompatible: %j', async (change) => {
    const original = createAcademicData().asistencia[0]!
    await expect(
      createMockAcademicDatabase()
        .service('asistencia')
        .create({
          ...original,
          fecha: '2026-08-10',
          origen: 'MANUAL',
          ...change,
        }),
    ).rejects.toMatchObject({ status: 422 })
  })
  it('protege horarios, inscripción y evaluación que tienen historial', async () => {
    const database = createMockAcademicDatabase()
    const course = await database.service('cursadas').get('cursada-mat1-a')
    await expect(
      database
        .service('cursadas')
        .update(course.id, { ...course, horarios: [course.horarios[1]!] }),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      database.service('inscripciones').softDelete('inscripcion-1'),
    ).rejects.toThrow('historial')
    await expect(
      database.service('evaluaciones').softDelete('evaluacion-1'),
    ).rejects.toMatchObject({ status: 409 })
    const enrollment = await database
      .service('inscripciones')
      .get('inscripcion-1')
    await expect(
      database
        .service('inscripciones')
        .update(enrollment.id, {
          ...enrollment,
          cursadaId: 'cursada-mat1-b',
        }),
    ).rejects.toMatchObject({ status: 409 })
    await database
      .service('inscripciones')
      .update(enrollment.id, {
        ...enrollment,
        estado: 'INACTIVO',
        condicionAcademica: 'REGULAR',
      })
    expect(
      (await database.service('asistencia').get('asistencia-1')).origen,
    ).toBe('RFID')
  })
  it('crea evaluaciones, valida resultados y corrige notas sin cambiar la condición académica', async () => {
    const database = createMockAcademicDatabase()
    const evaluations = database.service('evaluaciones')
    const evaluation = await evaluations.create({
      ...createAcademicData().evaluaciones[0]!,
      nombre: 'Recuperatorio',
      tipo: 'RECUPERATORIO',
      fecha: '2026-08-17',
    })
    const service = database.service('resultados')
    const input = {
      ...createAcademicData().resultados[0]!,
      evaluacionId: evaluation.id,
      nota: 5.99,
    }
    const saved = await service.create(input)
    expect(saved.estado).toBe('DESAPROBADO')
    expect(
      (await service.update(saved.id, { ...saved, nota: 6 })).estado,
    ).toBe('APROBADO')
    expect(
      (await database.service('inscripciones').get('inscripcion-1'))
        .condicionAcademica,
    ).toBe('CURSANDO')
    await expect(service.create(input)).rejects.toMatchObject({ status: 409 })
    await expect(
      service.create({ ...input, alumnoId: 'alumno-3' }),
    ).rejects.toThrow('inscripción')
    await expect(
      service.update(saved.id, { ...saved, nota: 11 }),
    ).rejects.toMatchObject({ status: 422 })
    await service.softDelete(saved.id)
    await evaluations.softDelete(evaluation.id)
    await expect(evaluations.get(evaluation.id)).rejects.toMatchObject({
      status: 404,
    })
  })
  it('rechaza notas de una evaluación futura y de fechas previas a la inscripción', async () => {
    const database = createMockAcademicDatabase()
    const evaluation = await database
      .service('evaluaciones')
      .create({
        ...createAcademicData().evaluaciones[0]!,
        fecha: '2026-10-01',
      })
    const input = {
      ...createAcademicData().resultados[0]!,
      evaluacionId: evaluation.id,
    }
    await expect(
      database.service('resultados').create(input),
    ).rejects.toThrow('futura')
    await database
      .service('evaluaciones')
      .update(evaluation.id, { ...evaluation, fecha: '2026-07-01' })
    await expect(
      database.service('resultados').create(input),
    ).rejects.toThrow('anterior a la inscripción')
  })
})
describe('Cuotas y RFID', () => {
  it('registra y corrige pagos, mantiene unicidad mensual y ordena importes numéricamente', async () => {
    const service = createMockAcademicDatabase().service('cuotas')
    const original = await service.get('cuota-1')
    expect(original.estado).toBe('VENCIDA')
    const paid = await service.update(original.id, {
      ...original,
      fechaPago: '2026-09-18',
    })
    expect(paid.estado).toBe('PAGADA')
    expect(
      (await service.update(original.id, { ...paid, fechaPago: '' })).estado,
    ).toBe('VENCIDA')
    await expect(service.create(original)).rejects.toMatchObject({
      status: 409,
    })
    const pending = await service.create({
      ...original,
      mes: 9,
      importe: 200,
      fechaVencimiento: '2026-09-18',
    })
    const later = await service.create({ ...pending, mes: 10, importe: 1000 })
    expect(pending.estado).toBe('PENDIENTE')
    expect(
      (
        await service.list({
          ...defaultListParams('cuotas'),
          sortBy: 'importe',
        })
      ).data
        .slice(0, 2)
        .map((row) => row.id),
    ).toEqual([pending.id, later.id])
    vi.setSystemTime(new Date('2026-09-19T03:00:00Z'))
    expect(
      (
        await service.list({
          ...defaultListParams('cuotas'),
          estado: 'VENCIDA',
        })
      ).data.map((row) => row.id),
    ).toContain(pending.id)
    await service.softDelete(pending.id)
    await expect(service.create(pending)).rejects.toMatchObject({
      status: 409,
    })
  })
  it('resuelve RFID exacto entre alumnos y profesores, refleja reasignaciones y excluye bajas', async () => {
    const database = createMockAcademicDatabase()
    expect(await database.rfid.findPerson(' demo-a-1 ')).toMatchObject({
      tipo: 'ALUMNO',
      persona: { id: 'alumno-1' },
    })
    expect(await database.rfid.findPerson('demo-p-1')).toMatchObject({
      tipo: 'PROFESOR',
      persona: { id: 'profesor-1' },
    })
    expect(await database.rfid.findPerson('DEMO-A')).toBeNull()
    const person = await database.service('alumnos').get('alumno-3')
    await database
      .service('alumnos')
      .update(person.id, { ...person, rfid: 'nueva-3' })
    expect(await database.rfid.findPerson(person.rfid)).toBeNull()
    expect(await database.rfid.findPerson('NUEVA-3')).toMatchObject({
      persona: { id: person.id },
    })
    await expect(
      database
        .service('profesores')
        .update('profesor-1', {
          ...createAcademicData().profesores[0]!,
          rfid: 'nueva-3',
        }),
    ).rejects.toThrow('RFID')
    await database.service('alumnos').softDelete(person.id)
    expect(await database.rfid.findPerson('NUEVA-3')).toBeNull()
    await expect(
      database
        .service('profesores')
        .update('profesor-1', {
          ...createAcademicData().profesores[0]!,
          rfid: 'nueva-3',
        }),
    ).rejects.toThrow('RFID')
  })
})
