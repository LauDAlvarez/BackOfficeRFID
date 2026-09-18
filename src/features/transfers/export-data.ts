import { catalog, displayValue, type Lookups } from '../academic/catalog'
import {
  fieldValue,
  type AcademicDomain,
  type AcademicRecord,
} from '../academic/schemas'
import { scheduleLabel } from '../gestion/presentation'
import type { ExportCell } from './csv'

export function exportMatrix(
  domain: AcademicDomain,
  rows: AcademicRecord[],
  lookups: Lookups,
): ExportCell[][] {
  const fields = catalog[domain].fields
  return [
    [
      ...fields.map((field) => field.label),
      ...(domain === 'cursadas' ? ['Horarios'] : []),
    ],
    ...rows.map((row) => [
      ...fields.map((field): ExportCell => {
        const raw = fieldValue(row, field.name)
        return field.type === 'number' && typeof raw === 'number'
          ? raw
          : displayValue(field, row, lookups)
      }),
      ...('horarios' in row
        ? [
            row.horarios
              .map((item) => scheduleLabel(row.id, item.id, lookups))
              .join('; '),
          ]
        : []),
    ]),
  ]
}
