import { Link } from 'react-router'
import type { AcademicRecord, Cuota } from '../academic/schemas'
import type { Lookups } from '../academic/catalog'
import { Can } from '../auth/Can'
import { studentFeeSummary } from './presentation'

export function GestionDetails({
  record,
  lookups,
}: {
  record: AcademicRecord
  lookups: Lookups
}) {
  const links: { to: string; label: string }[] = []
  if ('evaluacionId' in record) {
    const evaluation = lookups.evaluaciones?.find(
      (row) => row.id === record.evaluacionId,
    )
    links.push({
      to: `/evaluaciones/${encodeURIComponent(record.evaluacionId)}`,
      label: 'Ver evaluación',
    })
    if (evaluation && 'cursadaId' in evaluation)
      links.push({
        to: `/inscripciones?alumnoId=${encodeURIComponent(record.alumnoId)}&cursadaId=${encodeURIComponent(evaluation.cursadaId)}`,
        label: 'Ver condición académica',
      })
  }
  if ('horarios' in record)
    links.push(
      {
        to: `/asistencia?cursadaId=${encodeURIComponent(record.id)}`,
        label: 'Ver asistencia',
      },
      {
        to: `/evaluaciones?cursadaId=${encodeURIComponent(record.id)}`,
        label: 'Ver evaluaciones',
      },
    )
  if ('tipo' in record && 'cursadaId' in record)
    links.push({
      to: `/resultados?evaluacionId=${encodeURIComponent(record.id)}`,
      label: 'Ver resultados',
    })
  if ('planEstudioId' in record)
    links.push(
      {
        to: `/cuotas?alumnoId=${encodeURIComponent(record.id)}`,
        label: 'Ver cuotas',
      },
      {
        to: `/asistencia?alumnoId=${encodeURIComponent(record.id)}`,
        label: 'Ver asistencia',
      },
      {
        to: `/resultados?alumnoId=${encodeURIComponent(record.id)}`,
        label: 'Ver resultados',
      },
      {
        to: `/inscripciones?alumnoId=${encodeURIComponent(record.id)}`,
        label: 'Ver condición académica',
      },
    )
  const cuotas = (lookups.cuotas ?? []).filter(
    (row): row is Cuota => 'importe' in row && row.alumnoId === record.id,
  )
  return (
    <>
      {'planEstudioId' in record && (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <strong>Situación de cuotas: </strong>
          {studentFeeSummary(cuotas)}.
        </p>
      )}
      {links.length > 0 && (
        <nav
          aria-label="Consultas relacionadas"
          className="mt-5 flex flex-wrap gap-3"
        >
          {links.map((link) => (
            <Link key={link.to} className="button-secondary" to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
      {'tipo' in record && 'cursadaId' in record && (
        <Can permission="create">
          <Link
            className="button-secondary mt-3"
            to={`/resultados/nuevo?evaluacionId=${encodeURIComponent(record.id)}`}
          >
            Cargar resultado
          </Link>
        </Can>
      )}
    </>
  )
}
