import { createContext, useContext } from 'react'
import type { useAuthController } from './use-auth-controller'

export const AuthContext = createContext<ReturnType<
  typeof useAuthController
> | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('Se requiere AuthProvider.')
  return context
}
