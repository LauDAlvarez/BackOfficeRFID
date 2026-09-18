import type { Lookups } from '../academic/catalog'
import type { AcademicDomain, AcademicInput } from '../academic/schemas'
import type { RelationIssue } from '../academic/relations'
import { todayInCordoba } from '../../utils/date'

export function gestionIssues(
  domain: AcademicDomain,
  input: AcademicInput,
  lookups: Lookups,
  id?: string,
): RelationIssue[] {
  const issues: RelationIssue[] = []
  const evaluation =
    'evaluacionId' in input
      ? lookups.evaluaciones?.find(
          (row) => row.id === input.evaluacionId && !row.deletedAt,
        )
      : undefined
  const courseId =
    'cursadaId' in input
      ? input.cursadaId
      : evaluation && 'cursadaId' in evaluation
        ? evaluation.cursadaId
        : undefined
  const course = lookups.cursadas?.find(
    (row) => row.id === courseId && !row.deletedAt,
  )
  const date =
    'fecha' in input
      ? input.fecha
      : evaluation && 'fecha' in evaluation
        ? evaluation.fecha
        : undefined
  if (
    (domain === 'asistencia' || domain === 'resultados') &&
    'alumnoId' in input
  ) {
    const enrollment = lookups.inscripciones?.find(
      (row) =>
        'condicionAcademica' in row &&
        !row.deletedAt &&
        row.alumnoId === input.alumnoId &&
        row.cursadaId === courseId,
    )
    if (!enrollment || !('fechaInscripcion' in enrollment))
      issues.push({
        field: 'alumnoId',
        message: 'El alumno debe tener una inscripción en la cursada.',
      })
    else if (date && enrollment.fechaInscripcion > date)
      issues.push({
        field: 'alumnoId',
        message:
          'La fecha no puede ser anterior a la inscripción del alumno.',
      })
  }
  if (domain === 'asistencia' && 'horarioCursadaId' in input) {
    const schedule =
      course && 'horarios' in course
        ? course.horarios.find((row) => row.id === input.horarioCursadaId)
        : undefined
    if (!schedule)
      issues.push({
        field: 'horarioCursadaId',
        message: 'El horario debe pertenecer a la cursada elegida.',
      })
    else if (
      (new Date(`${input.fecha}T12:00:00Z`).getUTCDay() || 7) !==
      schedule.diaSemana
    )
      issues.push({
        field: 'fecha',
        message: 'La fecha debe coincidir con el día semanal del horario.',
      })
    const period =
      course && 'periodoAcademicoId' in course
        ? lookups['periodos-academicos']?.find(
            (row) => row.id === course.periodoAcademicoId,
          )
        : undefined
    if (
      period &&
      'fechaInicio' in period &&
      (input.fecha < period.fechaInicio || input.fecha > period.fechaFin)
    )
      issues.push({
        field: 'fecha',
        message: 'La asistencia debe estar dentro del período académico.',
      })
    if (
      lookups.asistencia?.some(
        (row) =>
          'horarioCursadaId' in row &&
          row.id !== id &&
          row.alumnoId === input.alumnoId &&
          row.horarioCursadaId === input.horarioCursadaId &&
          row.fecha === input.fecha,
      )
    )
      issues.push({
        field: 'fecha',
        message:
          'Ya existe asistencia de este alumno para esa fecha y horario.',
      })
  }
  if (domain === 'resultados' && 'evaluacionId' in input) {
    if (date && date > todayInCordoba())
      issues.push({
        field: 'evaluacionId',
        message: 'No se pueden cargar notas de una evaluación futura.',
      })
    if (
      lookups.resultados?.some(
        (row) =>
          'evaluacionId' in row &&
          row.id !== id &&
          row.evaluacionId === input.evaluacionId &&
          row.alumnoId === input.alumnoId,
      )
    )
      issues.push({
        field: 'alumnoId',
        message:
          'El alumno ya tiene un resultado en esta evaluación. Editá el existente.',
      })
  }
  if (
    domain === 'cuotas' &&
    'importe' in input &&
    lookups.cuotas?.some(
      (row) =>
        'importe' in row &&
        row.id !== id &&
        row.alumnoId === input.alumnoId &&
        row.anio === input.anio &&
        row.mes === input.mes,
    )
  )
    issues.push({
      field: 'mes',
      message: 'Ya existe una cuota del alumno para ese año y mes.',
    })
  return issues
}
