import type { Lookups } from '../academic/catalog'
import { weekDays } from '../cursadas/schemas'
import type { Cuota } from '../academic/schemas'
import { feeState } from './schemas'

export function scheduleLabel(
  cursadaId: string,
  horarioId: string,
  lookups: Lookups,
): string {
  const course = lookups.cursadas?.find((row) => row.id === cursadaId)
  const horario =
    course && 'horarios' in course
      ? course.horarios.find((row) => row.id === horarioId)
      : undefined
  if (!horario) return 'Horario no disponible'
  const aula = lookups.aulas?.find((row) => row.id === horario.aulaId)
  return `${weekDays.find((day) => day.value === horario.diaSemana)?.label} · ${horario.horaInicio}–${horario.horaFin} · Aula ${aula && 'numero' in aula ? aula.numero : 'no disponible'}`
}
export function studentFeeSummary(cuotas: Cuota[]): string {
  const live = cuotas.filter((row) => !row.deletedAt)
  if (!live.length) return 'Sin cuotas registradas'
  const overdue = live.filter((row) => feeState(row) === 'VENCIDA').length
  const pending = live.filter((row) => feeState(row) === 'PENDIENTE').length
  if (overdue)
    return `${overdue} cuota(s) vencida(s)${pending ? ` y ${pending} pendiente(s)` : ''}`
  return pending
    ? `${pending} cuota(s) pendiente(s), sin vencimientos impagos`
    : 'Todas las cuotas registradas están pagadas'
}
