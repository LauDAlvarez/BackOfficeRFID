import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/render-app'
import {
  createMockAuthService,
  mockAdmin,
  mockSecretary,
  MOCK_SESSION_DURATION,
} from '../../mocks/auth-service'
import { ApiError } from '../../lib/api-error'
import { notifySessionExpired } from '../../lib/session-events'
import type { AuthSession } from './auth-schemas'

async function enterCredentials(email = mockAdmin.email) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Contraseña'), 'contraseña ficticia')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await screen.findByRole('heading', { name: 'Verificá tu identidad' })
  return user
}

describe('Flujos de autenticación', () => {
  it('protege rutas, exige segundo factor y vuelve al destino solicitado', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const { client } = await renderApp('/alumnos', { session: null })
    expect(
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    const user = await enterCredentials()
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '000000')
    await user.click(
      screen.getByRole('button', { name: 'Verificar e ingresar' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El código es incorrecto',
    )
    expect(screen.getByLabelText('Código de 6 dígitos')).toHaveValue('')
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '123456')
    await user.click(
      screen.getByRole('button', { name: 'Verificar e ingresar' }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Alumnos' }),
    ).toBeInTheDocument()
    expect(storage).not.toHaveBeenCalled()
    expect(client.getMutationCache().getAll()).toHaveLength(0)
  })

  it('permite ingresar mediante un código de recuperación', async () => {
    await renderApp('/iniciar-sesion', { session: null })
    const user = await enterCredentials(mockSecretary.email)
    await user.click(
      screen.getByRole('button', { name: 'Usar un código de recuperación' }),
    )
    await user.type(
      screen.getByLabelText('Código de recuperación', { selector: 'input' }),
      'DEMO-RECUPERAR-01',
    )
    await user.click(
      screen.getByRole('button', { name: 'Verificar e ingresar' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Bienvenido al backoffice' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Secretaría · Sesión de demostración/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Usuarios administrativos/ }),
    ).not.toBeInTheDocument()
  })

  it('impide abrir la verificación sin un desafío y permite cancelar un login', async () => {
    await renderApp('/verificar-identidad', { session: null })
    const user = await enterCredentials()
    await user.click(
      screen.getByRole('link', { name: 'Volver al inicio de sesión' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Código de 6 dígitos'),
    ).not.toBeInTheDocument()
  })

  it('oculta usuarios y bloquea la URL directa para Secretaría', async () => {
    await renderApp('/usuarios', {
      session: {
        user: mockSecretary,
        expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
      },
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No tenés acceso a este módulo',
    )
    const navigation = screen.getByRole('navigation', {
      name: 'Navegación principal',
    })
    expect(
      within(navigation).queryByRole('link', {
        name: 'Usuarios administrativos',
      }),
    ).not.toBeInTheDocument()
  })

  it('limpia datos consultados al cerrar sesión', async () => {
    const user = userEvent.setup()
    const { client } = await renderApp('/alumnos')
    client.setQueryData(['datos-privados'], { nombre: 'Registro de prueba' })
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cerraste la sesión')
    expect(client.getQueryData(['datos-privados'])).toBeUndefined()
  })

  it('no declara un cierre confirmado si falla el servidor y permite reintentarlo', async () => {
    const service = createMockAuthService({
      initialSession: {
        user: mockAdmin,
        expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
      },
    })
    vi.spyOn(service, 'logout').mockRejectedValueOnce(
      new ApiError('Sin conexión'),
    )
    const user = userEvent.setup()
    await renderApp('/', { service })
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no pudimos confirmar el cierre',
    )
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Reintentar cierre de sesión' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cerraste la sesión',
    )
  })

  it('expira la sesión ante un 401 de recursos protegidos y vacía el caché', async () => {
    const { client } = await renderApp('/')
    client.setQueryData(['privado'], 'prueba')
    act(() => {
      notifySessionExpired()
    })
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión venció')
    expect(client.getQueryData(['privado'])).toBeUndefined()
  })

  it('comprueba la expiración al recuperar foco después de una suspensión', async () => {
    const expiresAt = Date.now() + MOCK_SESSION_DURATION
    await renderApp('/', {
      session: {
        user: mockAdmin,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    })
    vi.spyOn(Date, 'now').mockReturnValue(expiresAt + 1)
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión venció')
  })

  it('no muestra contenido protegido mientras restaura sesión y permite reintentar errores', async () => {
    let rejectSession: (error: Error) => void = () => {}
    const service = createMockAuthService()
    vi.spyOn(service, 'getSession').mockReturnValueOnce(
      new Promise<AuthSession | null>((_resolve, reject) => {
        rejectSession = reject
      }),
    )
    await renderApp('/alumnos', { service, waitForReady: false })
    expect(screen.getByRole('status')).toHaveTextContent('Comprobando sesión')
    expect(
      screen.queryByRole('heading', { name: 'Alumnos' }),
    ).not.toBeInTheDocument()
    await act(async () => {
      rejectSession(new ApiError('Servidor no disponible'))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Servidor no disponible',
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
  })

  it('rechaza restaurar sesiones vencidas o perfiles no administrativos', async () => {
    const service = createMockAuthService()
    vi.spyOn(service, 'getSession').mockResolvedValue({
      user: mockAdmin,
      expiresAt: new Date(Date.now() - 1).toISOString(),
    })
    await renderApp('/alumnos', { service })
    expect(
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Alumnos' }),
    ).not.toBeInTheDocument()
  })

  it('no restaura una sesión si la consulta inicial termina luego de su invalidación', async () => {
    let resolveSession: (session: AuthSession) => void = () => {}
    const service = createMockAuthService()
    vi.spyOn(service, 'getSession').mockReturnValueOnce(
      new Promise<AuthSession>((resolve) => {
        resolveSession = resolve
      }),
    )
    await renderApp('/alumnos', { service, waitForReady: false })
    act(() => {
      notifySessionExpired()
    })
    await act(async () => {
      resolveSession({
        user: mockAdmin,
        expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
      })
    })
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
  })

  it('recupera y restablece sin guardar secretos ni iniciar sesión automáticamente', async () => {
    const user = userEvent.setup()
    const { service } = await renderApp('/recuperar-contrasena', {
      session: null,
    })
    const reset = vi.spyOn(service, 'resetPassword')
    await user.type(screen.getByLabelText('Email'), mockAdmin.email)
    await user.click(screen.getByRole('button', { name: 'Solicitar enlace' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si existe una cuenta habilitada',
    )
    await user.click(
      screen.getByRole('link', { name: 'Abrir enlace de demostración' }),
    )
    await user.type(
      screen.getByLabelText('Nueva contraseña'),
      'frase de demostracion nueva',
    )
    await user.type(screen.getByLabelText('Repetir contraseña'), 'no coincide')
    await user.click(
      screen.getByRole('button', { name: 'Restablecer contraseña' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Las contraseñas no coinciden',
    )
    expect(reset).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('Repetir contraseña'))
    await user.type(
      screen.getByLabelText('Repetir contraseña'),
      'frase de demostracion nueva',
    )
    await user.click(
      screen.getByRole('button', { name: 'Restablecer contraseña' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Simulación completada',
    )
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
    expect(await service.getSession()).toBeNull()
    await user.click(
      screen.getByRole('link', { name: 'Volver al inicio de sesión' }),
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Iniciar sesión' }),
      ).toBeInTheDocument()
    })
  })

  it('ofrece solicitar otro enlace ante tokens inválidos', async () => {
    const user = userEvent.setup()
    await renderApp('/restablecer-contrasena#token=invalido', { session: null })
    await user.type(
      screen.getByLabelText('Nueva contraseña'),
      'frase de demostracion nueva',
    )
    await user.type(
      screen.getByLabelText('Repetir contraseña'),
      'frase de demostracion nueva',
    )
    await user.click(
      screen.getByRole('button', { name: 'Restablecer contraseña' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El enlace es inválido',
    )
    expect(
      screen.getByRole('link', { name: 'Solicitar nuevo enlace' }),
    ).toBeInTheDocument()
  })
})
