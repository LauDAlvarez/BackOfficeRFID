import { useFormContext, useWatch } from 'react-hook-form'
import type { AcademicInput } from '../academic/schemas'
import type { Lookups } from '../academic/catalog'
import { activeEnrollmentCount, courseCapacity } from './rules'

export function EnrollmentContext({
  lookups,
  recordId,
}: {
  lookups: Lookups
  recordId?: string | undefined
}) {
  const { control } = useFormContext<AcademicInput>()
  const cursadaId = useWatch({ control, name: 'cursadaId' })
  const estado = useWatch({ control, name: 'estado' })
  const course = lookups.cursadas?.find((row) => row.id === cursadaId)
  if (!course || !('horarios' in course)) return null
  const capacity = courseCapacity(course, lookups)
  const occupied = activeEnrollmentCount(cursadaId, lookups, recordId)
  return (
    <p
      className="mt-5 rounded-lg bg-brand-50 p-4 text-sm leading-6 text-brand-800"
      aria-live="polite"
    >
      Cupo según aulas: {capacity ?? 'sin determinar'}. Otras inscripciones
      activas: {occupied}.{' '}
      {estado === 'ACTIVO'
        ? 'Esta inscripción ocupará un lugar.'
        : 'Una inscripción inactiva no ocupa lugar.'}{' '}
      La condición académica se administra por separado.
    </p>
  )
}
