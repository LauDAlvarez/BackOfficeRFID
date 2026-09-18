import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAcademicData } from '../../mocks/academic-data'
import {
  asistenciaSchema,
  cuotaSchema,
  resultadoSchema,
  rfidSchema,
  feeState,
} from './schemas'
import { studentFeeSummary } from './presentation'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-18T12:00:00Z'))
})
afterEach(() => vi.useRealTimers())
describe('Reglas de gestión académica', () => {
  it.each([-1, 10.01, NaN, Infinity])('rechaza la nota %s', (nota) => {
    expect(
      resultadoSchema.safeParse({
        ...createAcademicData().resultados[0],
        nota,
      }).success,
    ).toBe(false)
  })
  it.each([
    [0, 'DESAPROBADO'],
    [5.99, 'DESAPROBADO'],
    [6, 'APROBADO'],
    [10, 'APROBADO'],
  ] as const)(
    'calcula el resultado de %s sin aceptar estados inconsistentes',
    (nota, estado) => {
      expect(
        resultadoSchema.parse({ ...createAcademicData().resultados[0], nota })
          .estado,
      ).toBe(estado)
    },
  )
  it('deriva cuotas por día de Córdoba, con prioridad del pago', () => {
    const cuota = { fechaVencimiento: '2026-09-18', fechaPago: '' }
    expect(feeState(cuota)).toBe('PENDIENTE')
    vi.setSystemTime(new Date('2026-09-19T02:59:59Z'))
    expect(feeState(cuota)).toBe('PENDIENTE')
    vi.setSystemTime(new Date('2026-09-19T03:00:00Z'))
    expect(feeState(cuota)).toBe('VENCIDA')
    expect(feeState({ ...cuota, fechaPago: '2026-09-18' })).toBe('PAGADA')
  })
  it.each([
    { importe: 0 },
    { importe: -2 },
    { importe: 1.234 },
    { importe: Infinity },
    { mes: 13 },
    { mes: 0 },
    { anio: 2026.5 },
    { fechaPago: '2026-09-19' },
    { fechaVencimiento: '2026-02-30' },
  ])('rechaza datos de cuota inválidos: %j', (change) => {
    expect(
      cuotaSchema.safeParse({ ...createAcademicData().cuotas[0], ...change })
        .success,
    ).toBe(false)
  })
  it('acepta importes con centavos y calcula estado desde fechas', () => {
    expect(
      cuotaSchema.parse({
        ...createAcademicData().cuotas[0],
        importe: 10.15,
        fechaPago: '2026-09-18',
        estado: 'PENDIENTE',
      }).estado,
    ).toBe('PAGADA')
  })
  it('excluye bajas del resumen del alumno y distingue falta de cuotas de pagos completos', () => {
    const data = createAcademicData().cuotas
    expect(studentFeeSummary([])).toBe('Sin cuotas registradas')
    expect(studentFeeSummary(data)).toContain('vencida')
    expect(
      studentFeeSummary([
        { ...data[0]!, deletedAt: new Date().toISOString() },
        data[1]!,
      ]),
    ).toContain('pagadas')
  })
  it('normaliza RFID y rechaza identificadores vacíos', () => {
    expect(rfidSchema.parse('  demo-a-1 ')).toBe('DEMO-A-1')
    expect(rfidSchema.safeParse(' ').success).toBe(false)
    expect(rfidSchema.safeParse('tarjeta inválida').success).toBe(false)
  })
  it('rechaza asistencia futura y estados desconocidos', () => {
    const record = createAcademicData().asistencia[0]!
    expect(
      asistenciaSchema.safeParse({ ...record, fecha: '2026-09-19' }).success,
    ).toBe(false)
    expect(
      asistenciaSchema.safeParse({ ...record, estado: 'OTRO' }).success,
    ).toBe(false)
  })
})
