import { describe, expect, it, vi } from 'vitest'
import { createMockAcademicDatabase } from './academic-service'
import { createAcademicData } from './academic-data'
import {
  academicDomains,
  type AcademicDomain,
  type AcademicInput,
} from '../features/academic/schemas'
import { defaultListParams } from '../features/academic/use-academic'
import { apiClient } from '../lib/api-client'

function newInput(domain: AcademicDomain): AcademicInput {
  const data = createAcademicData()
  switch (domain) {
    case 'sedes':
      return { ...data.sedes[0]!, nombre: 'Sede nueva' }
    case 'edificios':
      return { ...data.edificios[0]!, nombre: 'Edificio nuevo' }
    case 'aulas':
      return { ...data.aulas[0]!, numero: '900' }
    case 'carreras':
      return { ...data.carreras[0]!, codigo: 'NUEVA' }
    case 'planes-estudio':
      return { ...data['planes-estudio'][0]!, codigo: 'NUEVO' }
    case 'materias':
      return { ...data.materias[0]!, codigo: 'NUEVA' }
    case 'periodos-academicos':
      return {
        ...data['periodos-academicos'][0]!,
        anio: 2027,
        fechaInicio: '2027-03-01',
        fechaFin: '2027-07-01',
      }
    case 'comisiones':
      return { nombre: 'Nueva', estado: 'ACTIVO' }
    case 'alumnos':
      return {
        ...data.alumnos[0]!,
        dni: '45000000',
        legajo: 'A-999',
        rfid: 'TEST-A-999',
      }
    case 'profesores':
      return {
        ...data.profesores[0]!,
        dni: '35000000',
        legajo: 'P-999',
        rfid: 'TEST-P-999',
      }
    case 'cursadas':
      return {
        ...data.cursadas[0]!,
        materiaId: 'materia-mat2',
        horarios: data.cursadas[0]!.horarios.map((horario) => ({
          ...horario,
          id: crypto.randomUUID(),
        })),
      }
    case 'inscripciones':
      return { ...data.inscripciones[0]!, alumnoId: 'alumno-3' }
    default:
      throw new Error(
        'Las reglas de gestión se verifican en gestion-service.test.ts.',
      )
  }
}
describe('Servicios mock del núcleo académico', () => {
  it.each(
    academicDomains.filter(
      (domain) =>
        !['asistencia', 'evaluaciones', 'resultados', 'cuotas'].includes(
          domain,
        ),
    ),
  )(
    'crea, consulta, modifica, desactiva y da de baja %s sin persistencia externa',
    async (domain) => {
      const database = createMockAcademicDatabase()
      const service = database.service(domain)
      const request = vi.spyOn(apiClient, 'get')
      const created = await service.create(newInput(domain))
      expect(created.deletedAt).toBeNull()
      expect(await service.get(created.id)).toEqual(created)
      const updated = await service.update(created.id, {
        ...created,
        estado: domain === 'aulas' ? 'INACTIVA' : 'INACTIVO',
      } as AcademicInput)
      expect(updated.createdAt).toBe(created.createdAt)
      expect(updated.estado).toMatch(/^INACTIV/)
      expect(
        (
          await service.list({
            ...defaultListParams(domain),
            estado: updated.estado,
          })
        ).data.map((row) => row.id),
      ).toContain(created.id)
      await service.softDelete(created.id)
      await expect(service.get(created.id)).rejects.toMatchObject({
        status: 404,
      })
      expect(
        (await service.list(defaultListParams(domain))).data.map(
          (row) => row.id,
        ),
      ).not.toContain(created.id)
      // La identidad sigue reservada, aunque el registro ya no sea consultable.
      await expect(service.create(newInput(domain))).rejects.toMatchObject({
        status: 409,
      })
      expect(request).not.toHaveBeenCalled()
    },
  )
  it('combina búsqueda sin acentos, filtros, orden y paginación', async () => {
    const service = createMockAcademicDatabase().service('alumnos')
    expect(
      (
        await service.list({
          ...defaultListParams('alumnos'),
          search: 'alvarez',
        })
      ).data[0]?.apellido,
    ).toBe('Álvarez')
    const first = await service.list({
      ...defaultListParams('alumnos'),
      filters: { carreraId: 'carrera-sistemas' },
      pageSize: 3,
      sortOrder: 'desc',
    })
    const second = await service.list({
      ...defaultListParams('alumnos'),
      filters: { carreraId: 'carrera-sistemas' },
      pageSize: 3,
      sortOrder: 'desc',
      page: 2,
    })
    expect(first.total).toBe(7)
    expect(first.data[0]?.apellido).toBe('Núñez')
    expect(
      first.data
        .map((row) => row.id)
        .some((id) => second.data.map((row) => row.id).includes(id)),
    ).toBe(false)
    expect(
      (await service.list({ ...defaultListParams('alumnos'), page: 999 }))
        .page,
    ).toBe(2)
  })
  it('valida unicidad de DNI, legajo y RFID, incluso entre alumnos y profesores', async () => {
    const database = createMockAcademicDatabase()
    const alumnos = database.service('alumnos')
    const initial = await alumnos.get('alumno-1')
    for (const field of ['dni', 'legajo', 'rfid'] as const) {
      await expect(
        alumnos.update('alumno-2', {
          ...(await alumnos.get('alumno-2')),
          [field]: initial[field],
        }),
      ).rejects.toMatchObject({ status: 409 })
    }
    const profesor = await database.service('profesores').get('profesor-1')
    await expect(
      database
        .service('profesores')
        .update(profesor.id, {
          ...profesor,
          rfid: initial.rfid.toLowerCase(),
        }),
    ).rejects.toThrow('RFID')
    expect(await alumnos.update(initial.id, initial)).toMatchObject({
      id: initial.id,
    })
  })
  it('rechaza referencias inexistentes y cambios de padres que rompen relaciones', async () => {
    const database = createMockAcademicDatabase()
    await expect(
      database
        .service('edificios')
        .create({ nombre: 'Otro', sedeId: 'ausente', estado: 'ACTIVO' }),
    ).rejects.toMatchObject({ status: 422 })
    const edificio = await database
      .service('edificios')
      .get('edificio-central')
    await expect(
      database
        .service('edificios')
        .update(edificio.id, { ...edificio, sedeId: 'sede-norte' }),
    ).rejects.toMatchObject({ status: 409 })
    const plan = await database.service('planes-estudio').get('plan-sis-2026')
    await expect(
      database
        .service('planes-estudio')
        .update(plan.id, { ...plan, carreraId: 'carrera-administracion' }),
    ).rejects.toMatchObject({ status: 409 })
    expect(
      (await database.service('edificios').get(edificio.id)).sedeId,
    ).toBe('sede-central')
  })
  it('protege referencias ante bajas y conserva copias independientes', async () => {
    const database = createMockAcademicDatabase()
    await expect(
      database.service('sedes').softDelete('sede-central'),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      database.service('materias').softDelete('materia-mat1'),
    ).rejects.toMatchObject({ status: 409 })
    for (const domain of [
      'resultados',
      'evaluaciones',
      'asistencia',
    ] as const)
      for (const row of createAcademicData()[domain])
        await database.service(domain).softDelete(row.id)
    for (const inscription of createAcademicData().inscripciones)
      await database.service('inscripciones').softDelete(inscription.id)
    for (const course of createAcademicData().cursadas)
      await database.service('cursadas').softDelete(course.id)
    await database.service('aulas').softDelete('aula-204')
    await database.service('edificios').softDelete('edificio-central')
    await database.service('sedes').softDelete('sede-central')
    await expect(
      database.service('sedes').get('sede-central'),
    ).rejects.toMatchObject({ status: 404 })
    const first = await database.service('alumnos').get('alumno-1')
    first.nombre = 'Mutado fuera del servicio'
    expect((await database.service('alumnos').get('alumno-1')).nombre).toBe(
      'Ana',
    )
    expect(
      (
        await createMockAcademicDatabase()
          .service('sedes')
          .list(defaultListParams('sedes'))
      ).total,
    ).toBe(2)
  })
  it('cancela lecturas mock', async () => {
    const abort = new AbortController()
    abort.abort()
    await expect(
      createMockAcademicDatabase()
        .service('sedes')
        .list(defaultListParams('sedes'), abort.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
