import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/render-app'
import { mockAcademicServices } from '../../test/mock-academic-services'
import { academicServices } from '../../services/academic'
import { ApiError } from '../../lib/api-error'
import {
  mockSecretary,
  MOCK_SESSION_DURATION,
} from '../../mocks/auth-service'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-18T12:00:00Z'))
  mockAcademicServices()
})
afterEach(() => vi.useRealTimers())
const changeDate = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('Flujos de gestión académica', () => {
  it('registra asistencia manual con alumnos inscriptos y horario dependiente', async () => {
    const user = userEvent.setup()
    await renderApp('/asistencia/nuevo')
    await user.selectOptions(
      await screen.findByLabelText('Cursada'),
      'cursada-mat1-a',
    )
    const alumnos = within(screen.getByLabelText('Alumno'))
    expect(
      alumnos.queryByRole('option', { name: /Cabrera/ }),
    ).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Alumno'), 'alumno-1')
    await user.selectOptions(
      screen.getByLabelText('Horario de clase'),
      'horario-mat1-a-mie',
    )
    changeDate('Fecha', '2026-08-04')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('día semanal')
    expect(academicServices.asistencia.create).not.toHaveBeenCalled()
    changeDate('Fecha', '2026-08-05')
    await user.selectOptions(screen.getByLabelText('Estado'), 'PRESENTE')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de asistencia' })
    expect(await screen.findByText('05/08/2026')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(academicServices.asistencia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        alumnoId: 'alumno-1',
        origen: 'MANUAL',
        horarioCursadaId: 'horario-mat1-a-mie',
      }),
    )
  })
  it('corrige un registro RFID conservando origen y maneja un error de guardado', async () => {
    const user = userEvent.setup()
    await renderApp('/asistencia/asistencia-1/editar')
    expect(await screen.findByLabelText('Origen')).toHaveValue('RFID')
    expect(screen.getByLabelText('Origen')).toHaveAttribute('readonly')
    await user.selectOptions(screen.getByLabelText('Estado'), 'JUSTIFICADO')
    vi.mocked(academicServices.asistencia.update).mockRejectedValueOnce(
      new ApiError('No se pudo guardar la corrección.'),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'guardar la corrección',
    )
    expect(screen.getByLabelText('Estado')).toHaveValue('JUSTIFICADO')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de asistencia' })
    expect(await screen.findByText('Justificado')).toBeInTheDocument()
    expect(academicServices.asistencia.update).toHaveBeenLastCalledWith(
      'asistencia-1',
      expect.objectContaining({ origen: 'RFID', estado: 'JUSTIFICADO' }),
    )
  })
  it('crea evaluación y carga resultado con aprobación desde 6', async () => {
    const user = userEvent.setup()
    await renderApp('/evaluaciones/nuevo?cursadaId=cursada-mat1-a')
    expect(await screen.findByLabelText('Cursada')).toHaveValue(
      'cursada-mat1-a',
    )
    await user.type(screen.getByLabelText('Nombre'), 'Segundo parcial')
    changeDate('Fecha', '2026-09-14')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await user.click(
      await screen.findByRole('link', { name: 'Cargar resultado' }),
    )
    await user.selectOptions(
      await screen.findByLabelText('Alumno'),
      'alumno-2',
    )
    const grade = screen.getByLabelText('Nota (0 a 10)')
    await user.clear(grade)
    await user.type(grade, '11')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('máxima es 10')
    await user.clear(grade)
    await user.type(grade, '6')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Resultado calculado: Aprobado',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de resultado' })
    expect(await screen.findByText('Aprobado')).toBeInTheDocument()
    expect(academicServices.resultados.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nota: 6,
        estado: 'APROBADO',
        alumnoId: 'alumno-2',
      }),
    )
    expect(academicServices.inscripciones.update).not.toHaveBeenCalled()
  })
  it('previene resultados duplicados antes de enviar y permite corregir notas', async () => {
    const user = userEvent.setup()
    const view = await renderApp(
      '/resultados/nuevo?evaluacionId=evaluacion-1',
    )
    await user.selectOptions(
      await screen.findByLabelText('Alumno'),
      'alumno-1',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ya tiene un resultado',
    )
    expect(academicServices.resultados.create).not.toHaveBeenCalled()
    view.unmount()
    await renderApp('/resultados/resultado-1/editar')
    const grade = await screen.findByLabelText('Nota (0 a 10)')
    await user.clear(grade)
    await user.type(grade, '5.5')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Desaprobado')).toBeInTheDocument()
  })
  it('registra pago de cuota y actualiza la situación derivada del alumno', async () => {
    const user = userEvent.setup()
    await renderApp('/alumnos/alumno-1')
    expect(
      await screen.findByText(/1 cuota\(s\) vencida/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Ver cuotas' }))
    expect(await screen.findByLabelText('Filtrar por alumno')).toHaveValue(
      'alumno-1',
    )
    await screen.findByRole('table')
    await user.click(screen.getByRole('link', { name: /Editar .*8\/2026/ }))
    await screen.findByLabelText('Fecha de pago (opcional)')
    changeDate('Fecha de pago (opcional)', '2026-09-18')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Estado calculado: Pagada',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Pagada')).toBeInTheDocument()
    await user.click(
      within(
        screen.getByRole('navigation', { name: 'Navegación principal' }),
      ).getByRole('link', { name: 'Alumnos' }),
    )
    await user.click(
      await screen.findByRole('link', { name: /Ver detalle de Álvarez/ }),
    )
    expect(
      await screen.findByText(/Todas las cuotas registradas están pagadas/),
    ).toBeInTheDocument()
  })
  it('administra la condición académica desde el resultado y conserva la nota', async () => {
    const user = userEvent.setup()
    await renderApp('/resultados/resultado-1')
    await user.click(
      await screen.findByRole('link', { name: 'Ver condición académica' }),
    )
    expect(await screen.findByLabelText('Filtrar por alumno')).toHaveValue(
      'alumno-1',
    )
    expect(screen.getByLabelText('Filtrar por cursada')).toHaveValue(
      'cursada-mat1-a',
    )
    await user.click(
      await screen.findByRole('link', { name: /^Editar Álvarez/ }),
    )
    await user.selectOptions(
      await screen.findByLabelText('Condición académica'),
      'PROMOCIONADO',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Promocionado')).toBeInTheDocument()
    expect(academicServices.resultados.update).not.toHaveBeenCalled()
  })
  it('consulta RFID exacto, muestra ausencia y permite administrar la asociación', async () => {
    const user = userEvent.setup()
    await renderApp('/rfid')
    const field = screen.getByLabelText('RFID')
    await user.type(field, 'desconocido')
    await user.click(screen.getByRole('button', { name: 'Consultar RFID' }))
    expect(
      await screen.findByText('No hay una persona asociada a ese RFID.'),
    ).toBeInTheDocument()
    await user.clear(field)
    await user.type(field, 'demo-p-1')
    await user.click(screen.getByRole('button', { name: 'Consultar RFID' }))
    expect(
      await screen.findByRole('heading', { name: 'Torres, Lucía' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('link', { name: 'Modificar asociación RFID' }),
    )
    const rfid = await screen.findByLabelText('RFID')
    await user.clear(rfid)
    await user.type(rfid, 'DEMO-A-1')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('RFID')
    await user.clear(rfid)
    await user.type(rfid, 'NUEVA-P-1')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('NUEVA-P-1')).toBeInTheDocument()
  })
  it('Secretaría consulta RFID y resultados sin controles de modificación', async () => {
    const user = userEvent.setup()
    await renderApp('/rfid', {
      session: {
        user: mockSecretary,
        expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
      },
    })
    await user.type(screen.getByLabelText('RFID'), 'DEMO-A-1')
    await user.click(screen.getByRole('button', { name: 'Consultar RFID' }))
    await screen.findByRole('heading', { name: 'Álvarez, Ana' })
    expect(
      screen.queryByRole('link', { name: 'Modificar asociación RFID' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Ver persona' }))
    await user.click(
      await screen.findByRole('link', { name: 'Ver resultados' }),
    )
    expect(await screen.findByLabelText('Filtrar por alumno')).toHaveValue(
      'alumno-1',
    )
    await screen.findByRole('table')
    expect(
      screen.queryByRole('link', { name: 'Crear resultado' }),
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('link', { name: /Ver detalle de Álvarez/ }),
    )
    await screen.findByRole('heading', { name: 'Detalle de resultado' })
    expect(
      screen.queryByRole('link', { name: 'Editar resultado' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Dar de baja' }),
    ).not.toBeInTheDocument()
  })
  it('reintenta consultas y filtra asistencia por fecha, estado y origen', async () => {
    const user = userEvent.setup()
    vi.mocked(academicServices.asistencia.list).mockRejectedValueOnce(
      new ApiError('Consulta interrumpida.'),
    )
    await renderApp('/asistencia')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Consulta interrumpida',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('table')
    await user.selectOptions(
      screen.getByLabelText('Filtrar por origen'),
      'RFID',
    )
    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'PRESENTE',
    )
    changeDate('Filtrar por fecha', '2026-08-03')
    expect(await screen.findByText('1–1 de 1 registros')).toBeInTheDocument()
    changeDate('Filtrar por fecha', '2026-08-04')
    expect(
      await screen.findByText('No hay registros para mostrar'),
    ).toBeInTheDocument()
  })
})
