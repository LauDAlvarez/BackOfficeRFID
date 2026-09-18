import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/render-app'
import { mockAcademicServices } from '../../test/mock-academic-services'
import {
  importFile,
  importRow,
  importTable,
  blobText,
} from '../../test/transfer-fixtures'
import { transferService } from '../../services/transfers'
import {
  mockSecretary,
  MOCK_SESSION_DURATION,
} from '../../mocks/auth-service'
import * as downloads from './download'
import { ApiError } from '../../lib/api-error'
import { parseCsv } from './csv'

beforeEach(() => {
  mockAcademicServices()
  vi.spyOn(downloads, 'downloadFile').mockImplementation(() => {})
})
const secretary = () => ({
  user: mockSecretary,
  expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
})

describe('Importación administrativa', () => {
  it.each(['alumnos', 'profesores'] as const)(
    'previsualiza y confirma %s sin guardar antes de confirmar',
    async (domain) => {
      const user = userEvent.setup()
      await renderApp(`/${domain}/importar`)
      await user.upload(
        screen.getByLabelText('Archivo CSV o XLSX'),
        importFile(domain),
      )
      await screen.findByRole('table', { name: 'Registros del archivo' })
      expect(screen.getByText('María')).toBeInTheDocument()
      expect(transferService.commit).not.toHaveBeenCalled()
      await user.click(
        screen.getByRole('button', { name: 'Importar 1 registros' }),
      )
      const dialog = screen.getByRole('dialog', {
        name: 'Confirmar importación',
      })
      await user.click(
        within(dialog).getByRole('button', { name: 'Cancelar' }),
      )
      expect(transferService.commit).not.toHaveBeenCalled()
      await user.click(
        screen.getByRole('button', { name: 'Importar 1 registros' }),
      )
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Confirmar importación',
        }),
      )
      expect(
        await screen.findByText(/Se importaron 1 registros/),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Importar 1 registros' }),
      ).not.toBeInTheDocument()
      await user.click(
        screen.getByRole('link', { name: `Volver a ${domain}` }),
      )
      await screen.findByRole('table')
      await user.type(
        screen.getByRole('searchbox', { name: 'Buscar' }),
        'NUEVA-001',
      )
      await user.click(screen.getByRole('button', { name: 'Buscar' }))
      expect(
        await screen.findByText('1–1 de 1 registros'),
      ).toBeInTheDocument()
      expect(screen.getByText('María')).toBeInTheDocument()
    },
  )
  it('muestra errores por fila, bloquea el lote y permite corregirlo seleccionando otro archivo', async () => {
    const user = userEvent.setup()
    await renderApp('/alumnos/importar')
    await user.upload(
      screen.getByLabelText('Archivo CSV o XLSX'),
      importFile('alumnos', [
        importRow('alumnos'),
        importRow('alumnos', { email: 'mal', plan_codigo: 'ADM-2026' }),
      ]),
    )
    await screen.findByRole('table')
    expect(
      screen.getByText(/email: Ingresá un email válido/),
    ).toBeInTheDocument()
    expect(screen.getByText(/el plan no pertenece/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Importar 2 registros' }),
    ).toBeDisabled()
    expect(transferService.commit).not.toHaveBeenCalled()
    await user.click(screen.getByLabelText('Mostrar solo filas con errores'))
    expect(screen.getByText('1–2 de 2 registros')).toBeInTheDocument()
    await user.upload(
      screen.getByLabelText('Archivo CSV o XLSX'),
      importFile('alumnos'),
    )
    expect(
      await screen.findByRole('button', { name: 'Importar 1 registros' }),
    ).toBeEnabled()
    expect(screen.queryByText(/el plan no pertenece/)).not.toBeInTheDocument()
  })
  it('rechaza conflictos nuevos al confirmar sin informar éxito ni crear parcialmente', async () => {
    const user = userEvent.setup()
    await renderApp('/profesores/importar')
    await user.upload(
      screen.getByLabelText('Archivo CSV o XLSX'),
      importFile('profesores'),
    )
    await user.click(
      await screen.findByRole('button', { name: 'Importar 1 registros' }),
    )
    const conflict = {
      ...importTable('profesores'),
      errors: [],
      rows: [
        {
          ...importTable('profesores').rows[0]!,
          errors: ['rfid: fue asignado a otra persona.'],
        },
      ],
    }
    vi.mocked(transferService.commit).mockResolvedValueOnce({
      status: 'INVALID',
      preview: conflict,
    })
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirmar importación',
      }),
    )
    expect(
      await screen.findByText('rfid: fue asignado a otra persona.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Importar 1 registros' }),
    ).toBeDisabled()
    expect(screen.queryByText(/Se importaron/)).not.toBeInTheDocument()
  })
  it('maneja archivos inválidos y errores de red sin conservar una previsualización anterior', async () => {
    const user = userEvent.setup({ applyAccept: false })
    await renderApp('/profesores/importar')
    await user.upload(
      screen.getByLabelText('Archivo CSV o XLSX'),
      importFile('profesores'),
    )
    await screen.findByRole('table')
    await user.upload(
      screen.getByLabelText('Archivo CSV o XLSX'),
      new File(['texto'], 'incorrecto.txt'),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('CSV o XLSX')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    vi.mocked(transferService.preview).mockRejectedValueOnce(
      new ApiError('No se pudo validar.'),
    )
    await user.upload(
      screen.getByLabelText('Archivo CSV o XLSX'),
      importFile('profesores'),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo validar',
    )
    await user.upload(
      screen.getByLabelText('Archivo CSV o XLSX'),
      importFile('profesores'),
    )
    expect(
      await screen.findByRole('button', { name: 'Importar 1 registros' }),
    ).toBeEnabled()
  })
  it('descarga ambas plantillas sin importar datos', async () => {
    const user = userEvent.setup()
    await renderApp('/alumnos/importar')
    await user.click(
      screen.getByRole('button', { name: 'Descargar plantilla CSV' }),
    )
    await waitFor(() =>
      expect(downloads.downloadFile).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'plantilla-alumnos.csv' }),
      ),
    )
    await user.click(
      screen.getByRole('button', { name: 'Descargar plantilla XLSX' }),
    )
    await waitFor(() =>
      expect(downloads.downloadFile).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'plantilla-alumnos.xlsx' }),
      ),
    )
    expect(transferService.commit).not.toHaveBeenCalled()
  })
})
describe('Permisos por rol y exportación', () => {
  it.each(['alumnos', 'profesores'] as const)(
    'bloquea importar %s por URL directa para Secretaría',
    async (domain) => {
      await renderApp(`/${domain}/importar`, { session: secretary() })
      expect(screen.getByRole('alert')).toHaveTextContent('No tenés acceso')
      expect(
        screen.queryByLabelText('Archivo CSV o XLSX'),
      ).not.toBeInTheDocument()
      expect(transferService.preview).not.toHaveBeenCalled()
      expect(transferService.commit).not.toHaveBeenCalled()
    },
  )
  it.each(['ADMINISTRADOR', 'SECRETARIA'] as const)(
    '%s exporta CSV y XLSX respetando filtros y sin habilitar importación a Secretaría',
    async (role) => {
      const user = userEvent.setup()
      await renderApp(
        '/alumnos',
        role === 'SECRETARIA' ? { session: secretary() } : {},
      )
      await screen.findByRole('table')
      if (role === 'SECRETARIA')
        expect(
          screen.queryByRole('link', { name: 'Importar alumnos' }),
        ).not.toBeInTheDocument()
      else
        expect(
          screen.getByRole('link', { name: 'Importar alumnos' }),
        ).toBeInTheDocument()
      await user.selectOptions(
        screen.getByLabelText('Filtrar por carrera'),
        'carrera-sistemas',
      )
      await screen.findByText('1–7 de 7 registros')
      await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
      await waitFor(() =>
        expect(downloads.downloadFile).toHaveBeenCalledTimes(1),
      )
      const file = vi.mocked(downloads.downloadFile).mock.calls[0]![0]
      expect(parseCsv(await blobText(file.blob)).rows).toHaveLength(7)
      await user.click(screen.getByRole('button', { name: 'Exportar Excel' }))
      await waitFor(() =>
        expect(downloads.downloadFile).toHaveBeenCalledTimes(2),
      )
      expect(transferService.export).toHaveBeenLastCalledWith(
        'alumnos',
        expect.objectContaining({
          filters: { carreraId: 'carrera-sistemas' },
        }),
        'xlsx',
        expect.any(AbortSignal),
      )
      expect(transferService.commit).not.toHaveBeenCalled()
    },
  )
  it('muestra fallo de exportación y permite reintentar sin descargar archivos parciales', async () => {
    const user = userEvent.setup()
    await renderApp('/cuotas')
    await screen.findByRole('table')
    vi.mocked(transferService.export).mockRejectedValueOnce(
      new ApiError('Falló la exportación.'),
    )
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falló la exportación',
    )
    expect(downloads.downloadFile).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    await waitFor(() =>
      expect(downloads.downloadFile).toHaveBeenCalledTimes(1),
    )
  })
  it('cancela una exportación pendiente al salir del módulo', async () => {
    const user = userEvent.setup()
    let complete: (file: { blob: Blob; filename: string }) => void = () => {}
    vi.mocked(transferService.export).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    const view = await renderApp('/alumnos')
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    const signal = vi.mocked(transferService.export).mock.calls[0]![3]!
    view.unmount()
    expect(signal.aborted).toBe(true)
    complete({ blob: new Blob(['datos']), filename: 'datos.csv' })
    await waitFor(() => expect(downloads.downloadFile).not.toHaveBeenCalled())
  })
})
