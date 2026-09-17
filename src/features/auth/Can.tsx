import type { PropsWithChildren, ReactNode } from 'react'
import type { Permission } from './permissions'
import { usePermissions } from './use-permissions'

export function Can({
  permission,
  children,
  fallback = null,
}: PropsWithChildren<{ permission: Permission; fallback?: ReactNode }>) {
  const { can } = usePermissions()
  return can(permission) ? children : fallback
}
