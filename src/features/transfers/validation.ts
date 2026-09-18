import {
  inputSchemaFor,
  type InputByDomain,
  type Alumno,
  type Profesor,
  type Carrera,
  type PlanEstudio,
} from '../academic/schemas'
import { normalizeSearch } from '../../utils/text'
import {
  importColumns,
  type ImportDomain,
  type ImportTable,
  type ImportPreview,
} from './contracts'

interface ImportContext {
  alumnos: Alumno[]
  profesores: Profesor[]
  carreras: Carrera[]
  'planes-estudio': PlanEstudio[]
}
const fieldColumns: Record<string, string> = {
  fechaNacimiento: 'fecha_nacimiento',
  fechaIngreso: 'fecha_ingreso',
  carreraId: 'carrera_codigo',
  planEstudioId: 'plan_codigo',
}

export function prepareImport<D extends ImportDomain>(
  domain: D,
  table: ImportTable,
  context: ImportContext,
): { preview: ImportPreview; inputs: InputByDomain[D][] } {
  const headers = table.headers.map((header) =>
    header.trim().replace(/^\uFEFF/, ''),
  )
  const expected: readonly string[] = importColumns[domain]
  const errors: string[] = []
  const missing = expected.filter((header) => !headers.includes(header))
  const extra = headers.filter((header) => !expected.includes(header))
  if (missing.length) errors.push(`Faltan columnas: ${missing.join(', ')}.`)
  if (extra.length)
    errors.push(`Columnas no reconocidas: ${extra.join(', ')}.`)
  if (new Set(headers).size !== headers.length)
    errors.push('Hay encabezados repetidos.')
  if (!table.rows.length) errors.push('El archivo no contiene registros.')
  if (new Set(table.rows.map((row) => row.line)).size !== table.rows.length)
    errors.push('La numeración de filas no es válida.')
  const inputs: InputByDomain[D][] = []
  const preview: ImportPreview = {
    headers,
    errors,
    rows: table.rows.map((row) => ({ ...row, errors: [...row.errors] })),
  }
  if (errors.length) return { preview, inputs }
  const identities = ['dni', 'legajo', 'rfid'] as const
  const fileIdentities = Object.fromEntries(
    identities.map((field) => [field, new Map<string, number[]>()]),
  ) as Record<(typeof identities)[number], Map<string, number[]>>
  preview.rows.forEach((row, index) => {
    const values = Object.fromEntries(
      headers.map((header, column) => [
        header,
        (row.values[column] ?? '').trim(),
      ]),
    )
    if (row.values.length !== headers.length)
      row.errors.push(
        `Se esperaban ${headers.length} columnas y se recibieron ${row.values.length}.`,
      )
    for (const [column, value] of Object.entries(values)) {
      if (/^=/.test(value))
        row.errors.push(`${column}: no se admiten fórmulas.`)
    }
    let carreraId = ''
    let planEstudioId = ''
    if (domain === 'alumnos') {
      const carrera = context.carreras.find(
        (item) =>
          !item.deletedAt &&
          normalizeSearch(item.codigo) ===
            normalizeSearch(values.carrera_codigo ?? ''),
      )
      const plan = context['planes-estudio'].find(
        (item) =>
          !item.deletedAt &&
          normalizeSearch(item.codigo) ===
            normalizeSearch(values.plan_codigo ?? ''),
      )
      carreraId = carrera?.id ?? ''
      planEstudioId = plan?.id ?? ''
      if (!carrera)
        row.errors.push(
          'carrera_codigo: no corresponde a una carrera disponible.',
        )
      if (!plan)
        row.errors.push('plan_codigo: no corresponde a un plan disponible.')
      else if (carrera && plan.carreraId !== carrera.id)
        row.errors.push(
          'plan_codigo: el plan no pertenece a la carrera indicada.',
        )
    }
    const parsed = inputSchemaFor(domain).safeParse({
      ...values,
      carreraId,
      planEstudioId,
      fechaNacimiento: values.fecha_nacimiento,
      fechaIngreso: values.fecha_ingreso,
    })
    if (!parsed.success)
      row.errors.push(
        ...parsed.error.issues.map(
          (issue) =>
            `${fieldColumns[String(issue.path[0])] ?? String(issue.path[0])}: ${issue.message}`,
        ),
      )
    else inputs.push(parsed.data)
    for (const field of identities) {
      const value = normalizeSearch(values[field] ?? '')
      if (!value) continue
      const existing =
        field === 'rfid'
          ? [...context.alumnos, ...context.profesores]
          : context[domain]
      if (existing.some((item) => normalizeSearch(item[field]) === value))
        row.errors.push(
          `${field}: ya existe, incluso si el registro está inactivo o dado de baja.`,
        )
      const duplicates = fileIdentities[field].get(value) ?? []
      duplicates.push(index)
      fileIdentities[field].set(value, duplicates)
    }
  })
  for (const field of identities)
    for (const indexes of fileIdentities[field].values()) {
      if (indexes.length > 1)
        for (const index of indexes)
          preview.rows[index]!.errors.push(
            `${field}: repetido dentro del archivo (filas ${indexes.map((item) => preview.rows[item]!.line).join(', ')}).`,
          )
    }
  return { preview, inputs }
}
