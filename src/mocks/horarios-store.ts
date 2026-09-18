import type { Cursada } from '../features/academic/schemas'
import type { HorarioCursada } from '../features/cursadas/schemas'
import { ApiError } from '../lib/api-error'

// Archivo en memoria: quitar un horario del agregado no destruye su registro.
export function createHorariosStore(courses: Cursada[]) {
  const records = new Map<
    string,
    HorarioCursada & { deletedAt: string | null }
  >()
  function save(course: Cursada) {
    for (const record of records.values()) {
      if (
        record.cursadaId === course.id &&
        !course.horarios.some((horario) => horario.id === record.id)
      ) {
        record.deletedAt ??= course.updatedAt
      }
    }
    for (const horario of course.horarios)
      records.set(horario.id, {
        ...horario,
        cursadaId: course.id,
        deletedAt: course.deletedAt,
      })
  }
  courses.forEach(save)
  return {
    save,
    validateOwnership(horarios: Cursada['horarios'], courseId?: string) {
      for (const horario of horarios) {
        const existing = records.get(horario.id)
        if (existing && existing.cursadaId !== courseId)
          throw new ApiError(
            'El horario pertenece a otra cursada, incluso si fue dado de baja.',
            409,
          )
      }
    },
  }
}
