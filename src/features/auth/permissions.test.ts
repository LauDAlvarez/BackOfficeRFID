import { describe, expect, it } from 'vitest'
import { hasPermission, permissions } from './permissions'
import { mockAdmin, mockSecretary } from '../../mocks/auth-service'
import { safeReturnPath } from './redirect'
import type { AdministrativeUser } from './auth-schemas'

describe('Permisos centralizados', () => {
  it.each(permissions)('Administrador tiene permiso %s', (permission) => {
    expect(hasPermission(mockAdmin, permission)).toBe(true)
  })
  it.each(permissions)('Secretaría respeta el permiso %s', (permission) => {
    expect(hasPermission(mockSecretary, permission)).toBe(
      ['read', 'exportCsv', 'exportExcel'].includes(permission),
    )
  })
  it('deniega acceso sin usuario o con un rol no permitido', () => {
    expect(hasPermission(null, 'read')).toBe(false)
    expect(
      hasPermission(
        { ...mockAdmin, rol: 'PROFESOR' } as unknown as AdministrativeUser,
        'read',
      ),
    ).toBe(false)
    expect(
      hasPermission(
        { ...mockAdmin, estado: 'INACTIVO' } as unknown as AdministrativeUser,
        'create',
      ),
    ).toBe(false)
  })
})

describe('Destino después del login', () => {
  it.each([
    'https://otro.test',
    '//otro.test',
    '/\\otro.test',
    '/iniciar-sesion',
    '/desconocido',
    null,
    { from: '/alumnos' },
  ])('descarta destinos externos o no permitidos: %s', (value) => {
    expect(safeReturnPath(value)).toBe('/')
  })
  it('conserva una ruta administrativa y sus filtros', () => {
    expect(safeReturnPath('/alumnos?buscar=Ana')).toBe('/alumnos?buscar=Ana')
  })
})
