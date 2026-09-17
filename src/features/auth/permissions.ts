import type { AdministrativeUser } from './auth-schemas'

export const permissions = [
  'read',
  'create',
  'update',
  'deactivate',
  'delete',
  'import',
  'exportCsv',
  'exportExcel',
  'manageUsers',
] as const
export type Permission = (typeof permissions)[number]
export const roleLabels: Record<AdministrativeUser['rol'], string> = {
  ADMINISTRADOR: 'Administrador',
  SECRETARIA: 'Secretaría',
}

const rolePermissions: Record<
  AdministrativeUser['rol'],
  readonly Permission[]
> = {
  ADMINISTRADOR: permissions,
  SECRETARIA: ['read', 'exportCsv', 'exportExcel'],
}

export function hasPermission(
  user: AdministrativeUser | null,
  permission: Permission,
): boolean {
  return (
    user?.estado === 'ACTIVO' &&
    Boolean(rolePermissions[user.rol]?.includes(permission))
  )
}
