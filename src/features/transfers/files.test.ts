import ExcelJS from 'exceljs'
import { describe, expect, it, vi } from 'vitest'
import { encodeCsv, parseCsv } from './csv'
import {
  createImportTemplate,
  createTransferFile,
  parseImportFile,
} from './files'
import { importColumns, MAX_FILE_BYTES, MAX_IMPORT_ROWS } from './contracts'
import { blobText, importFile, importRow } from '../../test/transfer-fixtures'

// Verificar la misma distribución que Vite sirve al navegador, además de los servicios Node.
vi.mock('exceljs', async () => ({
  default: (await import('exceljs/dist/exceljs.min.js')).default,
}))

describe('CSV', () => {
  it('lee UTF-8 con BOM, separadores alternativos, ceros iniciales, comillas y saltos de línea', () => {
    const parsed = parseCsv(
      '\uFEFFnombre;dni\r\n"Ana; ""María""\nPrueba";00123456\r\n\r\nEva;00123457\r\n',
    )
    expect(parsed.headers).toEqual(['nombre', 'dni'])
    expect(parsed.rows).toEqual([
      { line: 2, values: ['Ana; "María"\nPrueba', '00123456'], errors: [] },
      { line: 5, values: ['Eva', '00123457'], errors: [] },
    ])
  })
  it.each(['a,b\n"sin cerrar,b', 'a,b\nno"válido,b', 'a,b\n"uno"error,dos'])(
    'rechaza sintaxis ambigua: %s',
    (text) => {
      expect(() => parseCsv(text)).toThrow('CSV inválido')
    },
  )
  it('impide fórmulas al exportar CSV sin perder escapes ni Unicode', () => {
    const csv = encodeCsv([
      ['Nombre', 'Importe'],
      ['Álvarez, "Ana"\nApellido', 12.5],
      [' =1+1', 0],
      ['+351234567', -3],
      ['@SUM(1)', 1],
      ['\t-CMD', 2],
    ])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    const values = parseCsv(csv).rows.map((row) => row.values)
    expect(values[0]).toEqual(['Álvarez, "Ana"\nApellido', '12.5'])
    expect(values[1]?.[0]).toBe("' =1+1")
    expect(values[2]).toEqual(["'+351234567", '-3'])
    expect(values[3]?.[0]).toBe("'@SUM(1)")
  })
  it('limita filas y columnas antes de previsualizar', () => {
    expect(() =>
      parseCsv('nombre\n' + 'Ana\n'.repeat(MAX_IMPORT_ROWS + 1)),
    ).toThrow('límite')
    expect(() => parseCsv(Array(32).fill('dato').join(','))).toThrow(
      'columnas',
    )
  })
})
describe('Archivos y XLSX reales', () => {
  it.each(['alumnos', 'profesores'] as const)(
    'genera plantillas CSV y XLSX con el contrato de %s',
    async (domain) => {
      for (const format of ['csv', 'xlsx'] as const) {
        const template = await createImportTemplate(domain, format)
        const result = await parseImportFile(
          new File([template.blob], template.filename),
        )
        expect(result).toEqual({ headers: importColumns[domain], rows: [] })
      }
    },
  )
  it('lee XLSX con texto literal, identificadores y fechas sin coerción', async () => {
    const row = importRow('alumnos', {
      dni: '01234567',
      legajo: '0001',
      rfid: '000001',
      telefono: '+54351123456',
    })
    const file = await createTransferFile(
      [[...importColumns.alumnos], row],
      'alumnos',
      'xlsx',
    )
    const parsed = await parseImportFile(new File([file.blob], file.filename))
    expect(parsed.rows[0]?.values).toEqual(row)
    expect(parsed.rows[0]?.errors).toEqual([])
    const csv = await parseImportFile(importFile('alumnos'))
    expect(csv.rows[0]?.values[6]).toBe('0351123456')
  })
  it('marca fórmulas, hipervínculos e identificadores numéricos por fila', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Datos')
    sheet.addRow([...importColumns.profesores])
    sheet.addRow(importRow('profesores'))
    sheet.getCell('A2').value = { formula: '1+1', result: 2 }
    sheet.getCell('C2').value = 1234567
    sheet.getCell('F2').value = {
      text: 'enlace',
      hyperlink: 'https://example.test/',
    }
    const bytes = await workbook.xlsx.writeBuffer()
    const parsed = await parseImportFile(
      new File([new Uint8Array(bytes)], 'datos.xlsx'),
    )
    expect(parsed.rows[0]?.errors).toHaveLength(3)
    expect(parsed.rows[0]?.values[0]).toBe('')
  })
  it('exporta textos que parecen fórmulas como celdas de texto en XLSX', async () => {
    const file = await createTransferFile(
      [['Nombre'], ['=HYPERLINK("x")']],
      'texto',
      'xlsx',
    )
    const result = await parseImportFile(new File([file.blob], file.filename))
    expect(result.rows[0]?.values[0]).toBe('=HYPERLINK("x")')
    expect(result.rows[0]?.errors).toEqual([])
  })
  it('rechaza hojas múltiples y celdas combinadas', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Datos')
    sheet.addRow(['nombre', 'apellido'])
    workbook.addWorksheet('Otra')
    const file = async () =>
      new File(
        [new Uint8Array(await workbook.xlsx.writeBuffer())],
        'datos.xlsx',
      )
    await expect(parseImportFile(await file())).rejects.toThrow(
      'una sola hoja',
    )
    workbook.removeWorksheet('Otra')
    sheet.mergeCells('A2:B2')
    await expect(parseImportFile(await file())).rejects.toThrow('combinadas')
  })
  it('rechaza extensión incorrecta, archivos vacíos, excesivos, dañados o no UTF-8', async () => {
    for (const file of [
      new File(['hola'], 'datos.xls'),
      new File([], 'datos.csv'),
      new File(['a'.repeat(MAX_FILE_BYTES + 1)], 'datos.csv'),
      new File(['no es zip'], 'datos.xlsx'),
      new File([new Uint8Array([255, 255])], 'datos.csv'),
    ])
      await expect(parseImportFile(file)).rejects.toThrow()
  })
  it('genera CSV descargable también para listados vacíos', async () => {
    const file = await createTransferFile(
      [['Nombre', 'Estado']],
      'sedes',
      'csv',
    )
    expect(file.filename).toBe('sedes.csv')
    expect(parseCsv(await blobText(file.blob))).toEqual({
      headers: ['Nombre', 'Estado'],
      rows: [],
    })
  })
})
