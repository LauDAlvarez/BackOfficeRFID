import type { Lookups } from '../academic/catalog'
import type { AcademicRecord, InputByDomain } from '../academic/schemas'
import type { RelationIssue } from '../academic/relations'

function liveRecord(
  lookups: Lookups,
  domain: keyof Lookups,
  id: string,
): AcademicRecord | undefined {
  return lookups[domain]?.find((row) => row.id === id && !row.deletedAt)
}
export function activeEnrollmentCount(
  cursadaId: string,
  lookups: Lookups,
  exceptId?: string,
): number {
  return (lookups.inscripciones ?? []).filter(
    (row) =>
      'cursadaId' in row &&
      row.cursadaId === cursadaId &&
      row.estado === 'ACTIVO' &&
      !row.deletedAt &&
      row.id !== exceptId,
  ).length
}
export function courseCapacity(
  course: Pick<InputByDomain['cursadas'], 'horarios'>,
  lookups: Lookups,
): number | null {
  if (!course.horarios.length) return null
  const capacities = course.horarios.map((horario) => {
    const aula = liveRecord(lookups, 'aulas', horario.aulaId)
    return aula && 'capacidadMaxima' in aula ? aula.capacidadMaxima : null
  })
  return capacities.some((capacity) => capacity === null)
    ? null
    : Math.min(
        ...capacities.filter(
          (capacity): capacity is number => capacity !== null,
        ),
      )
}
export function cursadaIssues(
  input: InputByDomain['cursadas'],
  lookups: Lookups,
  id?: string,
): RelationIssue[] {
  const issues: RelationIssue[] = []
  const enrolled = id ? activeEnrollmentCount(id, lookups) : 0
  if (input.estado === 'ACTIVO') {
    const references = [
      ['materias', input.materiaId, 'materiaId'],
      ['comisiones', input.comisionId, 'comisionId'],
      ['periodos-academicos', input.periodoAcademicoId, 'periodoAcademicoId'],
      ...input.profesorIds.map(
        (profesorId) => ['profesores', profesorId, 'profesorIds'] as const,
      ),
    ] as const
    for (const [domain, referenceId, field] of references) {
      const record = liveRecord(lookups, domain, referenceId)
      if (record && record.estado !== 'ACTIVO')
        issues.push({
          field,
          message: 'Una cursada activa debe utilizar registros activos.',
        })
    }
  }
  input.horarios.forEach((horario, index) => {
    const aula = liveRecord(lookups, 'aulas', horario.aulaId)
    const path = ['horarios', index, 'aulaId']
    if (!aula || !('capacidadMaxima' in aula)) {
      issues.push({
        field: 'horarios',
        path,
        message: 'Elegí un aula disponible.',
      })
    } else if (input.estado === 'ACTIVO' && aula.estado !== 'ACTIVA') {
      issues.push({
        field: 'horarios',
        path,
        message: 'Una cursada activa debe utilizar aulas activas.',
      })
    } else if (enrolled > aula.capacidadMaxima) {
      issues.push({
        field: 'horarios',
        path,
        message: `El aula admite ${aula.capacidadMaxima} personas y hay ${enrolled} inscripciones activas.`,
      })
    }
    if (
      lookups.cursadas?.some(
        (row) =>
          'horarios' in row &&
          row.id !== id &&
          row.horarios.some((existing) => existing.id === horario.id),
      )
    ) {
      issues.push({
        field: 'horarios',
        path,
        message: 'El horario pertenece a otra cursada.',
      })
    }
  })
  return issues
}
export function inscripcionIssues(
  input: InputByDomain['inscripciones'],
  lookups: Lookups,
  id?: string,
): RelationIssue[] {
  const issues: RelationIssue[] = []
  const course = liveRecord(lookups, 'cursadas', input.cursadaId)
  const alumno = liveRecord(lookups, 'alumnos', input.alumnoId)
  if (
    lookups.inscripciones?.some(
      (row) =>
        'condicionAcademica' in row &&
        row.id !== id &&
        row.alumnoId === input.alumnoId &&
        row.cursadaId === input.cursadaId,
    )
  ) {
    issues.push({
      field: 'alumnoId',
      message:
        'El alumno ya tiene una inscripción en esta cursada. Editá la existente.',
    })
  }
  if (!course || !('materiaId' in course)) return issues
  const materia = liveRecord(lookups, 'materias', course.materiaId)
  if (
    alumno &&
    'planEstudioId' in alumno &&
    materia &&
    'planEstudioIds' in materia &&
    !materia.planEstudioIds.includes(alumno.planEstudioId)
  ) {
    issues.push({
      field: 'alumnoId',
      message:
        'La materia de la cursada no pertenece al plan de estudio del alumno.',
    })
  }
  if (input.estado === 'ACTIVO') {
    if (course.estado !== 'ACTIVO')
      issues.push({
        field: 'cursadaId',
        message: 'Una inscripción activa requiere una cursada activa.',
      })
    if (alumno && alumno.estado !== 'ACTIVO')
      issues.push({
        field: 'alumnoId',
        message: 'Una inscripción activa requiere un alumno activo.',
      })
    const capacity = courseCapacity(course, lookups)
    if (capacity === null)
      issues.push({
        field: 'cursadaId',
        message:
          'La cursada no tiene aulas válidas para calcular su capacidad.',
      })
    else if (
      activeEnrollmentCount(input.cursadaId, lookups, id) + 1 >
      capacity
    ) {
      issues.push({
        field: 'cursadaId',
        message: `No hay cupo disponible. La capacidad de la cursada es de ${capacity} alumnos.`,
      })
    }
  }
  return issues
}
