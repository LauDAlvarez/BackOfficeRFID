import { describe, expect, it } from 'vitest'
import { formatDate } from './date'

describe('Fechas argentinas', () => {
  it('no desplaza los días de calendario por la zona horaria', () => {
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
  })
  it('convierte instantes a la zona de Córdoba', () => {
    expect(formatDate('2026-01-01T01:00:00Z')).toBe('31/12/2025')
  })
  it('rechaza días inexistentes y admite años bisiestos', () => {
    expect(formatDate('2026-02-30')).toBe('—')
    expect(formatDate('2026-02-29')).toBe('—')
    expect(formatDate('2024-02-29')).toBe('29/02/2024')
    expect(formatDate('inválido')).toBe('—')
  })
})
