import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Brand } from '../../components/layout/Brand'
import { Icon } from '../../components/ui/Icon'
import { env } from '../../lib/env'

export function AuthLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    const titles: Record<string, string> = {
      '/iniciar-sesion': 'Iniciar sesión',
      '/verificar-identidad': 'Verificar identidad',
      '/recuperar-contrasena': 'Recuperar contraseña',
      '/restablecer-contrasena': 'Restablecer contraseña',
    }
    document.title = `${titles[pathname] ?? 'Acceso'} | Backoffice Facultad`
  }, [pathname])
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-2">
      <aside className="bg-brand-800 text-white lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:p-8">
        <Brand />
        <div className="hidden max-w-lg px-5 py-12 lg:block">
          <Icon name="institution" className="mb-7 size-14 text-brand-200" />
          <h2 className="font-serif text-4xl leading-tight">
            Administración al servicio de la vida académica.
          </h2>
          <p className="mt-6 leading-7 text-brand-100">
            El espacio de trabajo del personal administrativo de la facultad.
          </p>
        </div>
        <p className="hidden px-5 py-6 text-sm text-brand-200 lg:block">
          Facultad · Gestión institucional
        </p>
      </aside>
      <main className="flex min-w-0 items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
        <div className="w-full max-w-md">
          {env.useMocks && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <strong>Demostración sin seguridad real.</strong> No uses
              contraseñas reales. La sesión se pierde al recargar; no se envían
              emails ni se vinculan aplicaciones de autenticación.
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
            <Outlet />
          </div>
          <p className="mt-5 text-center text-xs text-slate-500">
            Acceso exclusivo para personal administrativo.
          </p>
        </div>
      </main>
    </div>
  )
}
