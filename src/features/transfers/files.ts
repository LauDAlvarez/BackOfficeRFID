import type { CellValue } from 'exceljs'
import { ApiError } from '../../lib/api-error'
import { encodeCsv, parseCsv, type ExportCell } from './csv'
import {
  importColumns,
  MAX_CELL_LENGTH,
  MAX_COLUMNS,
  MAX_FILE_BYTES,
  MAX_IMPORT_ROWS,
  type DownloadFile,
  type ImportDomain,
  type ImportTable,
  type TransferFormat,
} from './contracts'

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export async function createTransferFile(
  rows: ExportCell[][],
  filename: string,
  format: TransferFormat,
): Promise<DownloadFile> {
  if (format === 'csv')
    return {
      filename: `${filename}.csv`,
      blob: new Blob([encodeCsv(rows)], { type: 'text/csv;charset=utf-8' }),
    }
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Datos', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  rows.forEach((row) => sheet.addRow(row))
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF204563' },
  }
  sheet.columns.forEach((column) => {
    column.width = 24
    column.numFmt = '@'
  })
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length), column: rows[0]?.length ?? 1 },
  }
  const buffer = await workbook.xlsx.writeBuffer()
  return {
    filename: `${filename}.xlsx`,
    blob: new Blob([new Uint8Array(buffer)], { type: XLSX_MIME }),
  }
}
export function createImportTemplate(
  domain: ImportDomain,
  format: TransferFormat,
): Promise<DownloadFile> {
  return createTransferFile(
    [[...importColumns[domain]]],
    `plantilla-${domain}`,
    format,
  )
}
function readBytes(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new ApiError('No se pudo leer el archivo.'))
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new ApiError('No se pudo leer el archivo.'))
    reader.readAsArrayBuffer(file)
  })
}
function xlsxCell(
  value: CellValue,
  header: string,
  errors: string[],
): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (value instanceof Date)
    return Number.isNaN(value.getTime())
      ? ''
      : value.toISOString().slice(0, 10)
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (['dni', 'legajo', 'rfid', 'telefono'].includes(header))
      errors.push(
        `${header}: guardá el identificador como texto para conservar todos sus dígitos.`,
      )
    return String(value)
  }
  errors.push(
    `${header || 'Celda'}: usá un valor simple; no se admiten fórmulas, enlaces ni errores de Excel.`,
  )
  return ''
}
export async function parseImportFile(file: File): Promise<ImportTable> {
  if (!/\.(csv|xlsx)$/i.test(file.name))
    throw new ApiError('Seleccioná un archivo CSV o XLSX.', 422)
  if (!file.size) throw new ApiError('El archivo está vacío.', 422)
  if (file.size > MAX_FILE_BYTES)
    throw new ApiError('El archivo supera el límite de 2 MB.', 422)
  const bytes = await readBytes(file)
  if (/\.csv$/i.test(file.name)) {
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      throw new ApiError('El CSV debe estar codificado en UTF-8.', 422)
    }
    if (text.includes('\0'))
      throw new ApiError(
        'El archivo no contiene un CSV de texto válido.',
        422,
      )
    return parseCsv(text)
  }
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(bytes)
  } catch {
    throw new ApiError(
      'No se pudo abrir el XLSX. Revisá que sea válido y no esté protegido con contraseña.',
      422,
    )
  }
  if (workbook.worksheets.length !== 1)
    throw new ApiError('El XLSX debe contener una sola hoja de datos.', 422)
  const sheet = workbook.worksheets[0]!
  if (sheet.rowCount > MAX_IMPORT_ROWS + 1 || sheet.columnCount > MAX_COLUMNS)
    throw new ApiError(
      `El XLSX supera el límite de ${MAX_IMPORT_ROWS} filas de datos o ${MAX_COLUMNS} columnas.`,
      422,
    )
  if (Object.keys(sheet.model.merges ?? {}).length)
    throw new ApiError('El XLSX no debe contener celdas combinadas.', 422)
  const headerErrors: string[] = []
  const headers = Array.from(
    { length: sheet.getRow(1).cellCount },
    (_, index) =>
      xlsxCell(
        sheet.getRow(1).getCell(index + 1).value,
        'Encabezado',
        headerErrors,
      ).trim(),
  )
  if (headerErrors.length)
    throw new ApiError('Los encabezados deben ser texto simple.', 422)
  const rows: ImportTable['rows'] = []
  for (let line = 2; line <= sheet.rowCount; line++) {
    const source = sheet.getRow(line)
    const errors: string[] = []
    const values = Array.from(
      { length: Math.max(headers.length, source.cellCount) },
      (_, index) =>
        xlsxCell(
          source.getCell(index + 1).value,
          headers[index] ?? '',
          errors,
        ),
    )
    if (values.some((value) => value.length > MAX_CELL_LENGTH))
      throw new ApiError(
        `La fila ${line} contiene una celda demasiado larga.`,
        422,
      )
    if (values.some((value) => value.trim() !== '') || errors.length)
      rows.push({ line, values, errors })
  }
  return { headers, rows }
}
