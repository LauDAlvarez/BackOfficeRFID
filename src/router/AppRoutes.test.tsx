import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../test/render-app'
import { modules } from './modules'

describe('Navegación de la foundation', () => {
  it.each(modules)(
    'permite abrir directamente $label',
    async ({ path, label }) => {
      await renderApp(path)
      expect(
        await screen.findByRole('heading', { level: 1, name: label }),
      ).toBeInTheDocument()
      const navigation = screen.getByRole('navigation', {
        name: 'Navegación principal',
      })
      expect(
        within(navigation).getByRole('link', { name: label }),
      ).toHaveAttribute('aria-current', 'page')
      expect(document.title).toBe(`${label} | Backoffice Facultad`)
      if (path === '/sedes') await screen.findByText('Sede Central')
    },
  )

  it('permite regresar desde una URL desconocida', async () => {
    const user = userEvent.setup()
    await renderApp('/no-existe')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Ir al inicio' }))
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Bienvenido al backoffice',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('abre el menú móvil y lo cierra al navegar', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    const dialog = screen.getByRole('dialog', { name: 'Menú de navegación' })
    await user.click(within(dialog).getByRole('link', { name: 'Profesores' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Profesores' }),
    ).toBeInTheDocument()
  })
  it('cierra el menú móvil al pasar a escritorio para no dejar un modal invisible', async () => {
    const media = window.matchMedia('(min-width: 1024px)')
    let onResize: () => void = () => {}
    const removeListener = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      ...media,
      matches: true,
      addEventListener: vi.fn((_type, listener) => {
        onResize = listener as () => void
      }),
      removeEventListener: removeListener,
    })
    const user = userEvent.setup()
    const view = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    expect(
      screen.getByRole('dialog', { name: 'Menú de navegación' }),
    ).toBeInTheDocument()
    act(onResize)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    view.unmount()
    expect(removeListener).toHaveBeenCalledWith('change', onResize)
  })
})
