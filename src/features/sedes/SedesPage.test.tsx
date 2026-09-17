import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sedesService } from '../../services'
import { ApiError } from '../../lib/api-error'
import { renderApp } from '../../test/render-app'
import type { SedeSummary } from './sede-schema'

describe('Consulta de Sedes', () => {
  it('muestra carga y luego un estado vacío sin inventar registros', async () => {
    let resolveQuery: (value: SedeSummary[]) => void = () => {}
    const pending = new Promise<SedeSummary[]>((resolve) => {
      resolveQuery = resolve
    })
    vi.spyOn(sedesService, 'list').mockReturnValue(pending)
    await renderApp('/sedes')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando sedes')
    await act(async () => {
      resolveQuery([])
    })
    expect(
      await screen.findByText('Todavía no hay sedes para mostrar'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('permite recuperarse de un error de conexión', async () => {
    const user = userEvent.setup()
    vi.spyOn(sedesService, 'list')
      .mockRejectedValueOnce(new ApiError('No hay conexión.'))
      .mockResolvedValueOnce([])
    await renderApp('/sedes')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay conexión.',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByText('Todavía no hay sedes para mostrar'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
