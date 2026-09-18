import { Link } from 'react-router'
import type { Lookups } from '../academic/catalog'
import type { Cursada } from '../academic/schemas'
import { Can } from '../auth/Can'
import { activeEnrollmentCount, courseCapacity } from './rules'
import { weekDays } from './schemas'
import { aulaLabel } from './presentation'

export function CourseDetails({
  course,
  lookups,
}: {
  course: Cursada
  lookups: Lookups
}) {
  const capacity = courseCapacity(course, lookups)
  const enrolled = activeEnrollmentCount(course.id, lookups)
  return (
    <section
      className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
      aria-labelledby="course-schedules"
    >
      <h2
        id="course-schedules"
        className="text-lg font-semibold text-brand-900"
      >
        Horarios e inscripciones
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {enrolled} inscripciones activas · Cupo según aulas:{' '}
        {capacity ?? 'sin determinar'}
        {capacity !== null
          ? ` · ${Math.max(0, capacity - enrolled)} lugares disponibles`
          : ''}
        .
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {course.horarios.map((horario) => {
          const aula = lookups.aulas?.find((row) => row.id === horario.aulaId)
          return (
            <li
              className="min-w-0 rounded-lg border border-slate-200 p-4"
              key={horario.id}
            >
              <p className="font-semibold">
                {weekDays.find((day) => day.value === horario.diaSemana)?.label}{' '}
                · {horario.horaInicio}–{horario.horaFin}
              </p>
              <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                {aula && 'capacidadMaxima' in aula
                  ? aulaLabel(aula, lookups)
                  : 'Aula no disponible'}
              </p>
            </li>
          )
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="button-secondary"
          to={`/inscripciones?cursadaId=${encodeURIComponent(course.id)}`}
        >
          Ver inscripciones
        </Link>
        <Can permission="create">
          <Link
            className="button-primary"
            to={`/inscripciones/nuevo?cursadaId=${encodeURIComponent(course.id)}`}
          >
            Inscribir alumno
          </Link>
        </Can>
      </div>
    </section>
  )
}
