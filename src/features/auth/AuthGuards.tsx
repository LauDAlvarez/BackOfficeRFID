import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from './auth-context'
import { usePermissions } from './use-permissions'
import type { Permission } from './permissions'
import { safeReturnPath } from './redirect'

export function AuthBootstrap() {
  const { state, checkSession } = useAuth()
  if (state.status === 'checking' || state.status === 'signingOut')
    return (
      <div className="mx-auto max-w-xl p-5 pt-16">
        <StatePanel
          role="status"
          icon="shield"
          title={
            state.status === 'checking'
              ? 'Comprobando sesión…'
              : 'Cerrando sesión…'
          }
          description="Esperá un momento."
        />
      </div>
    )
  if (state.status === 'unavailable')
    return (
      <main className="mx-auto max-w-xl p-5 pt-16">
        <StatePanel
          role="alert"
          icon="info"
          title="No pudimos comprobar la sesión"
          description={state.message}
        >
          <button
            className="button-primary"
            onClick={() => {
              void checkSession()
            }}
          >
            Reintentar
          </button>
        </StatePanel>
      </main>
    )
  return <Outlet />
}

export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status !== 'authenticated')
    return (
      <Navigate
        to="/iniciar-sesion"
        replace
        state={{
          from: safeReturnPath(`${location.pathname}${location.search}`),
        }}
      />
    )
  return <Outlet />
}

export function GuestOnly() {
  const { state } = useAuth()
  const location = useLocation()
  const returnTo = safeReturnPath(
    (location.state as { from?: unknown } | null)?.from,
  )
  return state.status === 'authenticated' ? (
    <Navigate to={returnTo} replace />
  ) : (
    <Outlet />
  )
}

export function RequireSecondFactor() {
  const { challenge } = useAuth()
  return challenge ? <Outlet /> : <Navigate to="/iniciar-sesion" replace />
}

export function RequirePermission({ permission }: { permission: Permission }) {
  const { can } = usePermissions()
  return can(permission) ? (
    <Outlet />
  ) : (
    <StatePanel
      role="alert"
      icon="shield"
      title="No tenés acceso a este módulo"
      description="Tu perfil no cuenta con los permisos necesarios."
    >
      <Link to="/" className="button-secondary">
        Volver al inicio
      </Link>
    </StatePanel>
  )
}
