import { modules } from '../../router/modules'

// Solo destinos del backoffice: evita redirecciones externas y bucles hacia login.
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some((character) => character.charCodeAt(0) < 32)
  )
    return '/'
  const url = new URL(value, 'https://backoffice.invalid')
  return url.origin === 'https://backoffice.invalid' &&
    (url.pathname === '/' ||
      modules.some((module) => module.path === url.pathname))
    ? `${url.pathname}${url.search}`
    : '/'
}
