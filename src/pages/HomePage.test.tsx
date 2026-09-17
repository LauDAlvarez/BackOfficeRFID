import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../test/render-app'

describe('Búsqueda de módulos', () => {
  it('encuentra nombres sin exigir tildes y permite abrir el resultado', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.type(screen.getByRole('searchbox'), '  PERIODOS  ')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      '1 módulo encontrado',
    )
    const main = screen.getByRole('main')
    expect(
      within(main).queryByRole('link', { name: /Legajos/ }),
    ).not.toBeInTheDocument()
    await user.click(
      within(main).getByRole('link', { name: /Períodos académicos/ }),
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Períodos académicos' }),
    ).toBeInTheDocument()
  })

  it('restaura una búsqueda desde la URL y permite limpiar un resultado vacío', async () => {
    const user = userEvent.setup()
    await renderApp('/?buscar=inexistente')
    expect(screen.getByRole('searchbox')).toHaveValue('inexistente')
    expect(screen.getByText('No encontramos módulos')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: /Legajos/ }),
    ).toBeInTheDocument()
  })

  it('rechaza búsquedas demasiado largas con un mensaje asociado al campo', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.type(screen.getByRole('searchbox'), 'x'.repeat(101))
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ingresá hasta 100 caracteres.',
    )
    expect(screen.getByRole('searchbox')).toHaveAccessibleDescription(
      'Ingresá hasta 100 caracteres.',
    )
    expect(screen.getByRole('searchbox')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
