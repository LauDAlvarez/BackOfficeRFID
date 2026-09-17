import type { PropsWithChildren } from 'react'
import { authService } from '../../services/auth'
import type { AuthService } from '../../services/auth-service'
import { AuthContext } from './auth-context'
import { useAuthController } from './use-auth-controller'

export function AuthProvider({
  children,
  service = authService,
}: PropsWithChildren<{ service?: AuthService }>) {
  const auth = useAuthController(service)
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
