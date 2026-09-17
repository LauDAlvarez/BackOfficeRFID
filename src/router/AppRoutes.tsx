import { Route, Routes } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { SedesPage } from '../features/sedes/SedesPage'
import { HomePage } from '../pages/HomePage'
import { ModulePage } from '../pages/ModulePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { modules } from './modules'
import {
  AuthBootstrap,
  GuestOnly,
  RequireAuth,
  RequirePermission,
  RequireSecondFactor,
} from '../features/auth/AuthGuards'
import { AuthLayout } from '../features/auth/AuthLayout'
import { LoginPage } from '../features/auth/LoginPage'
import { SecondFactorPage } from '../features/auth/SecondFactorPage'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthBootstrap />}>
        <Route element={<AuthLayout />}>
          <Route element={<GuestOnly />}>
            <Route path="iniciar-sesion" element={<LoginPage />} />
            <Route
              path="recuperar-contrasena"
              element={<ForgotPasswordPage />}
            />
            <Route element={<RequireSecondFactor />}>
              <Route
                path="verificar-identidad"
                element={<SecondFactorPage />}
              />
            </Route>
          </Route>
          <Route
            path="restablecer-contrasena"
            element={<ResetPasswordPage />}
          />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            {modules.map((module) => (
              <Route
                key={module.path}
                element={
                  <RequirePermission
                    permission={
                      'permission' in module ? module.permission : 'read'
                    }
                  />
                }
              >
                <Route
                  path={module.path.slice(1)}
                  element={
                    module.path === '/sedes' ? (
                      <SedesPage />
                    ) : (
                      <ModulePage module={module} />
                    )
                  }
                />
              </Route>
            ))}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
