import { useAuth } from './auth-context'
import { roleLabels } from './permissions'
import { env } from '../../lib/env'

export function SessionMenu() {
  const { state, logout } = useAuth()
  if (state.status !== 'authenticated') return null
  const { user } = state.session
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3 sm:w-auto sm:justify-end sm:border-0">
      <div className="min-w-0 text-sm sm:text-right">
        <p className="font-semibold text-slate-700">
          {user.nombre} {user.apellido}
        </p>
        <p className="text-xs text-slate-500">
          {roleLabels[user.rol]}
          {env.useMocks ? ' · Sesión de demostración' : ''}
        </p>
      </div>
      <button
        type="button"
        className="button-secondary shrink-0"
        onClick={() => {
          void logout()
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}
