import type { Lookups } from '../academic/catalog'
import type { Aula } from '../academic/schemas'

export function aulaLabel(aula: Aula, lookups: Lookups): string {
  const edificio = lookups.edificios?.find((row) => row.id === aula.edificioId)
  const sede = lookups.sedes?.find((row) => row.id === aula.sedeId)
  return `Aula ${aula.numero} · ${edificio && 'nombre' in edificio ? edificio.nombre : 'Edificio no disponible'} · ${sede && 'nombre' in sede ? sede.nombre : 'Sede no disponible'} · ${aula.capacidadMaxima} lugares${aula.estado === 'INACTIVA' ? ' (inactiva)' : ''}`
}
