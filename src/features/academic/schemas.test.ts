import { describe, expect, it } from 'vitest'
import {
  academicDomains,
  calendarDateSchema,
  inputSchemas,
  recordSchemaFor,
} from './schemas'
import { createAcademicData } from '../../mocks/academic-data'
import { relationIssues } from './relations'

const data = createAcademicData()
describe('Validaciones del núcleo académico', () => {
  it.each(academicDomains)(
    'valida los contratos de %s con auditoría',
    (domain) => {
      data[domain].forEach((record) =>
        expect(recordSchemaFor(domain).safeParse(record).success).toBe(true),
      )
    },
  )
  it.each(['2026-02-29', '2026-13-01', '01/03/2026', ''])(
    'rechaza la fecha inválida %s',
    (value) => {
      expect(calendarDateSchema.safeParse(value).success).toBe(false)
    },
  )
  it('valida fechas reales y orden del período', () => {
    expect(calendarDateSchema.safeParse('2024-02-29').success).toBe(true)
    expect(
      inputSchemas['periodos-academicos'].safeParse({
        ...data['periodos-academicos'][0],
        fechaFin: '2026-02-01',
      }).success,
    ).toBe(false)
    expect(
      inputSchemas['periodos-academicos'].safeParse({
        ...data['periodos-academicos'][0],
        anio: 2025,
      }).success,
    ).toBe(false)
  })
  it.each([0, -1, 1.5, NaN])('rechaza capacidad %s', (capacidadMaxima) => {
    expect(
      inputSchemas.aulas.safeParse({ ...data.aulas[0], capacidadMaxima })
        .success,
    ).toBe(false)
  })
  it.each([
    { dni: '40.000.001' },
    { legajo: '   ' },
    { rfid: '  ' },
    { email: 'correo' },
    { telefono: 'abc' },
    { fechaNacimiento: '2999-01-01' },
    { fechaIngreso: '2000-01-01' },
  ])('valida datos críticos del alumno: %j', (change) => {
    expect(
      inputSchemas.alumnos.safeParse({ ...data.alumnos[0], ...change }).success,
    ).toBe(false)
  })
  it('exige planes en materias sin repetir relaciones', () => {
    expect(
      inputSchemas.materias.safeParse({
        ...data.materias[0],
        planEstudioIds: [],
      }).success,
    ).toBe(false)
    expect(
      inputSchemas.materias.safeParse({
        ...data.materias[0],
        planEstudioIds: ['plan-sis-2026', 'plan-sis-2026'],
      }).success,
    ).toBe(false)
  })
  it('rechaza sede/edificio y carrera/plan incompatibles', () => {
    expect(
      relationIssues(
        'aulas',
        { ...data.aulas[0]!, sedeId: 'sede-norte' },
        data,
      ),
    ).toContainEqual(expect.objectContaining({ field: 'edificioId' }))
    expect(
      relationIssues(
        'alumnos',
        { ...data.alumnos[0]!, planEstudioId: 'plan-adm-2026' },
        data,
      ),
    ).toContainEqual(expect.objectContaining({ field: 'planEstudioId' }))
  })
  it('rechaza autorreferencias, reciprocidad y correlativas de planes distintos', () => {
    const materia = data.materias[0]!
    expect(
      relationIssues(
        'materias',
        { ...materia, correlativaIds: [materia.id] },
        data,
        materia.id,
      ),
    ).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('sí misma') }),
    )
    expect(
      relationIssues(
        'materias',
        { ...materia, correlativaIds: ['materia-mat2'] },
        data,
        materia.id,
      ),
    ).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('entre sí') }),
    )
    expect(
      relationIssues(
        'materias',
        {
          ...materia,
          planEstudioIds: ['plan-adm-2026'],
          correlativaIds: ['materia-mat2'],
        },
        data,
        materia.id,
      ),
    ).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('compartir'),
      }),
    )
  })
})
