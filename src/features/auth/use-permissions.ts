import { modules, type AppModule } from '../../router/modules'
import { useAuth } from './auth-context'
import { hasPermission, type Permission } from './permissions'

export function usePermissions() {
  const { state } = useAuth()
  const user = state.status === 'authenticated' ? state.session.user : null
  const can = (permission: Permission) => hasPermission(user, permission)
  const canAccessModule = (module: AppModule) =>
    can(module.permission ?? 'read')
  return {
    can,
    canAccessModule,
    accessibleModules: modules.filter(canAccessModule),
  }
}
