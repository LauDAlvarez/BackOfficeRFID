import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { modules } from '../../router/modules'
import { Icon } from '../ui/Icon'
import { Brand } from './Brand'
import { Navigation } from './Navigation'
import { SessionMenu } from '../../features/auth/SessionMenu'
import { env } from '../../lib/env'

export function AppLayout() {
  const { pathname } = useLocation()
  const canonicalPath = pathname.replace(/\/+$/, '') || '/'
  const dialogRef = useRef<HTMLDialogElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const currentModule = modules.find((module) => module.path === canonicalPath)
  const title =
    canonicalPath === '/'
      ? 'Inicio'
      : (currentModule?.label ?? 'Página no encontrada')

  useEffect(() => {
    document.title = `${title} | Backoffice Facultad`
    if (previousPath.current !== pathname) {
      dialogRef.current?.close()
      mainRef.current?.focus()
      window.scrollTo(0, 0)
      previousPath.current = pathname
    }
  }, [pathname, title])

  // Evita mantener un modal invisible al pasar de un ancho móvil a escritorio.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => {
      if (desktop.matches) dialogRef.current?.close()
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-white px-4 py-3 font-semibold text-brand-800 focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-brand-800 lg:flex">
        <Brand />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Navigation />
        </div>
        <div className="border-t border-white/15 px-6 py-4 text-xs text-brand-200">
          Backoffice · Facultad
        </div>
      </aside>

      <dialog
        ref={dialogRef}
        aria-labelledby="menu-title"
        className="fixed inset-y-0 right-auto left-0 m-0 h-dvh max-h-dvh w-80 max-w-[90vw] border-0 bg-brand-800 p-0 text-white"
      >
        <div className="flex items-center justify-between pr-4">
          <Brand />
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => dialogRef.current?.close()}
            className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-white/10"
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="menu-title" className="sr-only">
          Menú de navegación
        </h2>
        <Navigation onNavigate={() => dialogRef.current?.close()} />
      </dialog>

      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-64">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-4 pt-3 sm:px-8 sm:pt-0 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú"
              aria-haspopup="dialog"
              onClick={() => dialogRef.current?.showModal()}
              className="grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-brand-800 lg:hidden"
            >
              <Icon name="menu" />
            </button>
            <nav aria-label="Ubicación" className="min-w-0 text-sm">
              <ol className="flex flex-wrap items-center gap-2 text-slate-500">
                <li>
                  {pathname === '/' ? (
                    <span
                      className="min-w-0 break-words font-medium text-slate-700"
                      aria-current="page"
                    >
                      Inicio
                    </span>
                  ) : (
                    <Link to="/" className="hover:text-brand-700">
                      Inicio
                    </Link>
                  )}
                </li>
                {pathname !== '/' && (
                  <>
                    <li aria-hidden="true">
                      <Icon name="chevron" className="size-3" />
                    </li>
                    <li
                      className="font-medium text-slate-700"
                      aria-current="page"
                    >
                      {title}
                    </li>
                  </>
                )}
              </ol>
            </nav>
          </div>
          <SessionMenu />
        </header>

        <main
          id="contenido"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 outline-none sm:px-8 sm:py-9 lg:px-10"
        >
          <Outlet />
        </main>
        <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500 sm:px-8 lg:px-10">
          <span>Facultad · Administración académica</span>
          <span>
            {env.useMocks
              ? 'Demo sin seguridad real · No usar datos sensibles'
              : 'Backoffice administrativo'}
          </span>
        </footer>
      </div>
    </div>
  )
}
