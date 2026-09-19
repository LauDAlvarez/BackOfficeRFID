import { describe, expect, it, vi } from 'vitest'
import { createMockAcademicDatabase } from './academic-service'
import { createAcademicData } from './academic-data'
import { canImport, importColumns } from '../features/transfers/contracts'
import { importTable, importRow, blobText } from '../test/transfer-fixtures'
import { defaultListParams } from '../features/academic/use-academic'
import { parseCsv } from '../features/transfers/csv'
import { createMockTransferService } from './transfer-service'

describe('Importación atómica y validaciones de dominio', () => {
  it.each(['alumnos', 'profesores'] as const)(
    'previsualiza sin mutar e importa %s completo',
    async (domain) => {
      const database = createMockAcademicDatabase()
      const table = importTable(domain)
      const params = defaultListParams(domain)
      const before = (await database.service(domain).list(params)).total
      expect(canImport(await database.transfers.preview(domain, table))).toBe(
        true,
      )
      expect((await database.service(domain).list(params)).total).toBe(before)
      expect(await database.transfers.commit(domain, table)).toEqual({
        status: 'IMPORTED',
        imported: 1,
      })
      const result = await database
        .service(domain)
        .list({ ...params, search: 'NUEVA-001' })
      expect(result.data[0]).toMatchObject({
        dni: '49000001',
        rfid: 'NUEVA-001',
        telefono: '0351123456',
        estado: 'ACTIVO',
        deletedAt: null,
      })
      if (domain === 'alumnos')
        expect(result.data[0]).toMatchObject({
          carreraId: 'carrera-sistemas',
          planEstudioId: 'plan-sis-2026',
        })
      expect((await database.transfers.commit(domain, table)).status).toBe(
        'INVALID',
      )
      expect((await database.service(domain).list(params)).total).toBe(
        before + 1,
      )
    },
  )
  it('valida encabezados faltantes, desconocidos, repetidos y reordenados', async () => {
    const database = createMockAcademicDatabase()
    const original = importTable('profesores')
    for (const headers of [
      original.headers.slice(1),
      [...original.headers, 'extra'],
      [...original.headers, 'nombre'],
    ]) {
      const preview = await database.transfers.preview('profesores', {
        ...original,
        headers,
      })
      expect(preview.errors.length).toBeGreaterThan(0)
      expect(canImport(preview)).toBe(false)
    }
    expect(
      canImport(
        await database.transfers.preview('profesores', {
          headers: [...original.headers].reverse(),
          rows: original.rows.map((row) => ({
            ...row,
            values: [...row.values].reverse(),
          })),
        }),
      ),
    ).toBe(true)
    expect(
      canImport(
        await database.transfers.preview('profesores', {
          headers: [...importColumns.profesores],
          rows: [],
        }),
      ),
    ).toBe(false)
  })
  it.each([
    { dni: '12' },
    { email: 'incorrecto' },
    { estado: 'activo' },
    { fecha_nacimiento: '03/02/2001' },
    { fecha_ingreso: '2000-01-01' },
    { carrera_codigo: 'AUSENTE' },
    { plan_codigo: 'ADM-2026' },
    { plan_codigo: 'AUSENTE' },
    { rfid: 'DEMO-P-1' },
    { nombre: '=1+1' },
  ])('rechaza todo el lote por una fila inválida: %j', async (changes) => {
    const database = createMockAcademicDatabase()
    const table = importTable('alumnos', [
      importRow('alumnos'),
      importRow('alumnos', {
        dni: '49000002',
        legajo: 'N-002',
        rfid: 'NUEVA-002',
        ...changes,
      }),
    ])
    const result = await database.transfers.commit('alumnos', table)
    expect(result.status).toBe('INVALID')
    if (result.status === 'INVALID')
      expect(result.preview.rows[1]?.errors.length).toBeGreaterThan(0)
    expect(
      (
        await database
          .service('alumnos')
          .list({ ...defaultListParams('alumnos'), search: 'NUEVA-001' })
      ).total,
    ).toBe(0)
  })
  it('marca todas las filas duplicadas del archivo y respeta identificadores reservados', async () => {
    const database = createMockAcademicDatabase()
    const repeated = importTable('profesores', [
      importRow('profesores'),
      importRow('profesores', { rfid: 'nueva-001' }),
    ])
    const preview = await database.transfers.preview('profesores', repeated)
    expect(
      preview.rows.every((row) =>
        row.errors.some((error) => error.includes('filas 2, 3')),
      ),
    ).toBe(true)
    await database.service('alumnos').softDelete('alumno-3')
    const reserved = await database.transfers.preview(
      'profesores',
      importTable('profesores', [
        importRow('profesores', { rfid: 'DEMO-A-3' }),
      ]),
    )
    expect(reserved.rows[0]?.errors.join(' ')).toContain('dado de baja')
  })
  it('revalida referencias y duplicados al confirmar; dos confirmaciones no duplican altas', async () => {
    const database = createMockAcademicDatabase()
    const table = importTable('profesores')
    expect(
      canImport(await database.transfers.preview('profesores', table)),
    ).toBe(true)
    const results = await Promise.all([
      database.transfers.commit('profesores', table),
      database.transfers.commit('profesores', table),
    ])
    expect(results.map((result) => result.status).sort()).toEqual([
      'IMPORTED',
      'INVALID',
    ])
    const alumnos = importTable('alumnos')
    expect(
      canImport(await database.transfers.preview('alumnos', alumnos)),
    ).toBe(false)
    const valid = importTable('alumnos', [
      importRow('alumnos', { rfid: 'OTRA' }),
    ])
    expect(
      canImport(await database.transfers.preview('alumnos', valid)),
    ).toBe(true)
    const plan = await database.service('planes-estudio').get('plan-sis-2026')
    await database
      .service('planes-estudio')
      .update(plan.id, { ...plan, codigo: 'SIS-NUEVO' })
    expect((await database.transfers.commit('alumnos', valid)).status).toBe(
      'INVALID',
    )
  })
  it('rechaza filas truncadas, errores del lector y cancelaciones', async () => {
    const database = createMockAcademicDatabase()
    const table = importTable('profesores')
    table.rows[0]!.values.pop()
    table.rows[0]!.errors.push('Celda con fórmula')
    expect(
      canImport(await database.transfers.preview('profesores', table)),
    ).toBe(false)
    const controller = new AbortController()
    controller.abort()
    await expect(
      database.transfers.commit(
        'profesores',
        importTable('profesores'),
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
describe('Exportación completa y filtrada', () => {
  it.each(['repetida', 'vacía', 'total cambiado', 'total excedido'])(
    'rechaza una página %s sin entregar un archivo parcial',
    async (failure) => {
      const data = createAcademicData()
      const original = createMockAcademicDatabase(data).service('profesores')
      const row = data.profesores[0]!
      const list = vi
        .fn(original.list)
        .mockResolvedValueOnce({
          data: [row],
          total: 2,
          page: 1,
          pageSize: 100,
        })
        .mockResolvedValueOnce({
          data:
            failure === 'vacía'
              ? []
              : failure === 'total excedido'
                ? [
                    { ...row, id: 'otra' },
                    { ...row, id: 'extra' },
                  ]
                : [row],
          total: failure === 'total cambiado' ? 3 : 2,
          page: 2,
          pageSize: 100,
        })
      const service = createMockTransferService(data, () => ({
        ...original,
        list,
      }))
      await expect(
        service.export('profesores', defaultListParams('profesores'), 'csv'),
      ).rejects.toThrow()
      expect(list).toHaveBeenCalledTimes(2)
    },
  )
  it('incluye páginas completas, filtros, orden y excluye bajas', async () => {
    const data = createAcademicData()
    data.profesores = Array.from({ length: 125 }, (_, index) => ({
      ...data.profesores[0]!,
      id: `export-${index}`,
      nombre: `Docente ${String(index).padStart(3, '0')}`,
      legajo: String(index),
      estado: index === 0 ? 'INACTIVO' : 'ACTIVO',
      deletedAt: index === 1 ? new Date().toISOString() : null,
    }))
    const database = createMockAcademicDatabase(data)
    const file = await database.transfers.export(
      'profesores',
      {
        ...defaultListParams('profesores'),
        page: 5,
        pageSize: 10,
        estado: 'ACTIVO',
        search: 'Docente',
        sortBy: 'nombre',
        sortOrder: 'desc',
      },
      'csv',
    )
    const exported = parseCsv(await blobText(file.blob))
    expect(exported.rows).toHaveLength(123)
    expect(exported.rows[0]?.values[0]).toBe('Docente 124')
    expect(exported.rows.at(-1)?.values[0]).toBe('Docente 002')
    expect(exported.headers).toContain('RFID')
  })
  it('exporta relaciones, fechas argentinas y horarios legibles', async () => {
    const database = createMockAcademicDatabase()
    const cursos = parseCsv(
      await blobText(
        (
          await database.transfers.export(
            'cursadas',
            defaultListParams('cursadas'),
            'csv',
          )
        ).blob,
      ),
    )
    expect(cursos.rows[0]?.values.join(' ')).toContain('Matemática I')
    expect(cursos.rows[0]?.values.join(' ')).toContain(
      'Lunes · 18:00–20:00 · Aula 204',
    )
    const asistencia = parseCsv(
      await blobText(
        (
          await database.transfers.export(
            'asistencia',
            defaultListParams('asistencia'),
            'csv',
          )
        ).blob,
      ),
    )
    expect(asistencia.rows[0]?.values.join(' ')).toContain('03/08/2026')
  })
})
