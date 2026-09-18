import { catalog, type Lookups } from './catalog'
import {
  fieldValue,
  type AcademicDomain,
  type AcademicField,
  type AcademicInput,
} from './schemas'
import { cursadaIssues, inscripcionIssues } from '../cursadas/rules'
import { gestionIssues } from '../gestion/rules'

export interface RelationIssue {
  field: AcademicField | 'horarios'
  path?: (string | number)[]
  message: string
}
export function relationIssues(
  domain: AcademicDomain,
  input: AcademicInput,
  lookups: Lookups,
  id?: string,
): RelationIssue[] {
  const issues: RelationIssue[] = []
  for (const field of catalog[domain].fields) {
    if (!field.relation) continue
    const value = fieldValue(input, field.name)
    const ids = Array.isArray(value) ? value : value ? [String(value)] : []
    for (const relatedId of ids) {
      const record = lookups[field.relation]?.find(
        (item) => item.id === relatedId && !item.deletedAt,
      )
      if (!record) {
        issues.push({
          field: field.name,
          message: 'La selección ya no está disponible. Elegí otro registro.',
        })
      } else if (
        field.dependsOn &&
        field.relationParent &&
        fieldValue(record, field.relationParent) !==
          fieldValue(input, field.dependsOn)
      ) {
        issues.push({
          field: field.name,
          message:
            field.name === 'edificioId'
              ? 'El edificio debe pertenecer a la sede elegida.'
              : 'El plan debe pertenecer a la carrera elegida.',
        })
      }
      if (field.name === 'correlativaIds') {
        if (relatedId === id)
          issues.push({
            field: field.name,
            message: 'Una materia no puede ser correlativa de sí misma.',
          })
        if (
          record &&
          'planEstudioIds' in record &&
          'planEstudioIds' in input &&
          !record.planEstudioIds.some((plan) =>
            input.planEstudioIds.includes(plan),
          )
        ) {
          issues.push({
            field: field.name,
            message:
              'Las correlativas deben compartir al menos un plan de estudio.',
          })
        }
        if (
          record &&
          'correlativaIds' in record &&
          id &&
          record.correlativaIds.includes(id)
        ) {
          issues.push({
            field: field.name,
            message:
              'Dos materias no pueden ser correlativas previas entre sí.',
          })
        }
      }
    }
  }
  if (domain === 'cursadas' && 'horarios' in input)
    issues.push(...cursadaIssues(input, lookups, id))
  if (domain === 'inscripciones' && 'condicionAcademica' in input)
    issues.push(...inscripcionIssues(input, lookups, id))
  issues.push(...gestionIssues(domain, input, lookups, id))
  return issues
}
