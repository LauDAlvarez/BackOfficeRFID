import { Route, Routes } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { AcademicListPage } from '../features/academic/AcademicListPage'
import { AcademicFormPage } from '../features/academic/AcademicFormPage'
import { AcademicDetailPage } from '../features/academic/AcademicDetailPage'
import { isAcademicDomain } from '../features/academic/schemas'
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
import { RfidPage } from '../features/gestion/RfidPage'
import { ImportPage } from '../features/transfers/ImportPage'
import { isImportDomain } from '../features/transfers/contracts'

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
            {modules.map((module) => {
              const domain = module.path.slice(1)
              return (
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
                  {isAcademicDomain(domain) ? (
                    <Route path={domain}>
                      {isImportDomain(domain) && (
                        <Route
                          element={<RequirePermission permission="import" />}
                        >
                          <Route
                            path="importar"
                            element={
                              <ImportPage key={domain} domain={domain} />
                            }
                          />
                        </Route>
                      )}
                      <Route
                        index
                        element={
                          <AcademicListPage key={domain} domain={domain} />
                        }
                      />
                      <Route
                        element={<RequirePermission permission="create" />}
                      >
                        <Route
                          path="nuevo"
                          element={
                            <AcademicFormPage
                              key={`${domain}-new`}
                              domain={domain}
                            />
                          }
                        />
                      </Route>
                      <Route
                        element={<RequirePermission permission="update" />}
                      >
                        <Route
                          path=":id/editar"
                          element={
                            <AcademicFormPage
                              key={`${domain}-edit`}
                              domain={domain}
                            />
                          }
                        />
                      </Route>
                      <Route
                        path=":id"
                        element={
                          <AcademicDetailPage key={domain} domain={domain} />
                        }
                      />
                    </Route>
                  ) : (
                    <Route
                      path={domain}
                      element={
                        domain === 'rfid' ? (
                          <RfidPage />
                        ) : (
                          <ModulePage module={module} />
                        )
                      }
                    />
                  )}
                </Route>
              )
            })}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
