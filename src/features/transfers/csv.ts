import { ApiError } from '../../lib/api-error'
import {
  MAX_CELL_LENGTH,
  MAX_COLUMNS,
  MAX_IMPORT_ROWS,
  type ImportTable,
} from './contracts'

export function parseCsv(source: string): ImportTable {
  const text = source.replace(/^\uFEFF/, '')
  // Los encabezados no contienen separadores: admitir CSV con coma o punto y coma.
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const separator =
    (firstLine.match(/;/g)?.length ?? 0) >
    (firstLine.match(/,/g)?.length ?? 0)
      ? ';'
      : ','
  const rows: ImportTable['rows'] = []
  let headers: string[] | undefined
  let values: string[] = []
  let value = ''
  let quoted = false
  let closed = false
  let line = 1
  let startLine = 1
  const fail = () => {
    throw new ApiError(
      `CSV inválido cerca de la línea ${line}: revisá las comillas y separadores.`,
      422,
    )
  }
  const field = () => {
    if (value.length > MAX_CELL_LENGTH)
      throw new ApiError(
        `La línea ${startLine} contiene una celda demasiado larga.`,
        422,
      )
    values.push(value)
    value = ''
    closed = false
    if (values.length > MAX_COLUMNS)
      throw new ApiError('El archivo contiene demasiadas columnas.', 422)
  }
  const row = () => {
    field()
    if (!headers) headers = values
    else if (values.some((item) => item.trim() !== ''))
      rows.push({ line: startLine, values, errors: [] })
    values = []
    if (rows.length > MAX_IMPORT_ROWS)
      throw new ApiError(
        `El límite es ${MAX_IMPORT_ROWS} registros por archivo.`,
        422,
      )
  }
  for (let index = 0; index < text.length; index++) {
    const character = text[index]!
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          value += '"'
          index++
        } else {
          quoted = false
          closed = true
        }
      } else {
        value += character
        if (character === '\n') line++
      }
    } else if (character === '"') {
      if (value || closed) fail()
      quoted = true
    } else if (character === separator) field()
    else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index++
      row()
      line++
      startLine = line
    } else if (closed) {
      if (character !== ' ' && character !== '\t') fail()
    } else value += character
  }
  if (quoted) fail()
  if (value || values.length || closed || !headers) row()
  return { headers: headers ?? [], rows }
}

export type ExportCell = string | number
export function encodeCsv(rows: ExportCell[][]): string {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value)
            // CSV no tiene tipos de celda; impedir evaluación al abrirlo en una planilla.
            if (typeof value === 'string') {
              const first = Array.from(text).find(
                (character) =>
                  character.charCodeAt(0) > 31 && !/\s/u.test(character),
              )
              if (first && '=+@-'.includes(first)) text = `'${text}`
            }
            return `"${text.replaceAll('"', '""')}"`
          })
          .join(','),
      )
      .join('\r\n') +
    '\r\n'
  )
}
