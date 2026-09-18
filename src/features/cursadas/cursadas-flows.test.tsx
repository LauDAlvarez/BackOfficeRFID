import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAcademicData } from '../../mocks/academic-data'
import { mockSecretary, MOCK_SESSION_DURATION } from '../../mocks/auth-service'
import { academicServices } from '../../services/academic'
import { renderApp } from '../../test/render-app'
import { mockAcademicServices } from '../../test/mock-academic-services'
import { ApiError } from '../../lib/api-error'

beforeEach(() => {
  const data = createAcademicData()
  for (const index of [3, 4])
    data.profesores.push({
      ...data.profesores[0]!,
      id: `profesor-${index}`,
      nombre: `Docente ${index}`,
      legajo: `P-00${index}`,
      dni: `3000000${index}`,
      rfid: `DEMO-P-${index}`,
    })
  // Dos lugares, ambos ocupados, para ejercitar el cupo desde la UI.
  data.aulas[1]!.capacidadMaxima = 2
  mockAcademicServices(data)
})

describe('Formularios de cursadas e inscripciones', () => {
  it('crea una cursada con tres profesores y aulas distintas, validando los horarios', async () => {
    const user = userEvent.setup()
    await renderApp('/cursadas/nuevo')
    await user.selectOptions(
      await screen.findByLabelText('Materia'),
      'materia-mat2',
    )
    await user.selectOptions(screen.getByLabelText('Comisión'), 'comision-a')
    await user.selectOptions(
      screen.getByLabelText('Período académico'),
      'periodo-2026-2',
    )
    for (const legajo of ['P-001', 'P-002', 'P-003'])
      await user.click(
        screen.getByRole('checkbox', { name: new RegExp(legajo) }),
      )
    expect(screen.getByRole('checkbox', { name: /P-004/ })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /P-003/ }))
    expect(screen.getByRole('checkbox', { name: /P-004/ })).toBeEnabled()
    await user.click(screen.getByRole('checkbox', { name: /P-003/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'al menos un horario',
    )
    await user.click(screen.getByRole('button', { name: 'Agregar horario' }))
    const first = within(screen.getByRole('group', { name: 'Horario 1' }))
    fireEvent.change(first.getByLabelText('Hora de inicio'), {
      target: { value: '18:00' },
    })
    fireEvent.change(first.getByLabelText('Hora de fin'), {
      target: { value: '17:00' },
    })
    await user.selectOptions(first.getByLabelText('Aula'), 'aula-204')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'posterior al inicio',
    )
    fireEvent.change(first.getByLabelText('Hora de fin'), {
      target: { value: '20:00' },
    })
    await user.click(screen.getByRole('button', { name: 'Agregar horario' }))
    const second = within(screen.getByRole('group', { name: 'Horario 2' }))
    await user.selectOptions(second.getByLabelText('Día de la semana'), '3')
    fireEvent.change(second.getByLabelText('Hora de inicio'), {
      target: { value: '18:00' },
    })
    fireEvent.change(second.getByLabelText('Hora de fin'), {
      target: { value: '20:00' },
    })
    await user.selectOptions(second.getByLabelText('Aula'), 'aula-301')
    expect(screen.getByText(/Cupo según aulas: 2 alumnos/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de cursada' })
    expect(await screen.findByText('Lunes · 18:00–20:00')).toBeInTheDocument()
    expect(screen.getByText('Miércoles · 18:00–20:00')).toBeInTheDocument()
    expect(academicServices.cursadas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        profesorIds: ['profesor-1', 'profesor-2', 'profesor-3'],
        horarios: [
          expect.objectContaining({ diaSemana: 1, aulaId: 'aula-204' }),
          expect.objectContaining({ diaSemana: 3, aulaId: 'aula-301' }),
        ],
      }),
    )
  })
  it('edita y quita horarios sin cambiar la identidad del que se conserva', async () => {
    const user = userEvent.setup()
    await renderApp('/cursadas/cursada-mat1-a/editar')
    await screen.findByRole('group', { name: 'Horario 2' })
    await user.click(screen.getByRole('button', { name: 'Quitar horario 2' }))
    fireEvent.change(screen.getByLabelText('Hora de inicio'), {
      target: { value: '17:30' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de cursada' })
    expect(await screen.findByText('Lunes · 17:30–20:00')).toBeInTheDocument()
    expect(screen.queryByText(/Miércoles ·/)).not.toBeInTheDocument()
    expect(academicServices.cursadas.update).toHaveBeenCalledWith(
      'cursada-mat1-a',
      expect.objectContaining({
        horarios: [expect.objectContaining({ id: 'horario-mat1-a-lun' })],
      }),
    )
  })
  it('preselecciona la cursada, impide duplicados y cupo excedido sin perder datos', async () => {
    const user = userEvent.setup()
    await renderApp('/cursadas/cursada-mat1-a')
    await user.click(
      await screen.findByRole('link', { name: 'Inscribir alumno' }),
    )
    const courseSelect = await screen.findByLabelText('Cursada')
    expect(courseSelect).toHaveValue('cursada-mat1-a')
    await user.selectOptions(screen.getByLabelText('Alumno'), 'alumno-1')
    fireEvent.change(screen.getByLabelText('Fecha de inscripción'), {
      target: { value: '2026-08-01' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText(/ya tiene una inscripción/),
    ).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Alumno'), 'alumno-3')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText(/No hay cupo disponible/),
    ).toBeInTheDocument()
    expect(academicServices.inscripciones.create).not.toHaveBeenCalled()
    await user.selectOptions(courseSelect, 'cursada-mat1-b')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de inscripción' })
    expect(await screen.findByText('01/08/2026')).toBeInTheDocument()
    expect(academicServices.inscripciones.create).toHaveBeenCalledWith(
      expect.objectContaining({
        alumnoId: 'alumno-3',
        cursadaId: 'cursada-mat1-b',
        condicionAcademica: 'CURSANDO',
      }),
    )
  })
  it('permite cambiar la condición académica con el cupo lleno y consultar inscripciones de una cursada', async () => {
    const user = userEvent.setup()
    await renderApp('/inscripciones/inscripcion-1/editar')
    await user.selectOptions(
      await screen.findByLabelText('Condición académica'),
      'APROBADO',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de inscripción' })
    expect(await screen.findByText('Aprobado')).toBeInTheDocument()
    await user.click(
      screen.getByRole('link', { name: 'Volver a inscripciones' }),
    )
    await screen.findByRole('table')
    await user.selectOptions(
      screen.getByLabelText('Filtrar por condición académica'),
      'APROBADO',
    )
    expect(await screen.findByText('1–1 de 1 registros')).toBeInTheDocument()
  })
  it('respeta el filtro de cursada al navegar desde su detalle', async () => {
    const user = userEvent.setup()
    await renderApp('/cursadas/cursada-mat1-b')
    await user.click(
      await screen.findByRole('link', { name: 'Ver inscripciones' }),
    )
    expect(await screen.findByLabelText('Filtrar por cursada')).toHaveValue(
      'cursada-mat1-b',
    )
    await screen.findByText('No hay registros para mostrar')
    await user.selectOptions(
      screen.getByLabelText('Filtrar por cursada'),
      'cursada-mat1-a',
    )
    await screen.findByText('1–2 de 2 registros')
  })
  it('maneja fallos de referencias con reintento y errores tardíos de guardado', async () => {
    vi.mocked(academicServices.profesores.list).mockRejectedValueOnce(
      new ApiError('No se pudieron consultar docentes.'),
    )
    const user = userEvent.setup()
    await renderApp('/cursadas/cursada-mat1-a/editar')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'consultar docentes',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByLabelText('Materia')
    vi.mocked(academicServices.cursadas.update).mockRejectedValueOnce(
      new ApiError('El cupo cambió. Revisá las aulas.', 409),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El cupo cambió')
    expect(screen.getByLabelText('Materia')).toHaveValue('materia-mat1')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de cursada' })
  })
  it('Secretaría consulta horarios e inscripciones sin poder escribir', async () => {
    const user = userEvent.setup()
    await renderApp('/cursadas/cursada-mat1-a', {
      session: {
        user: mockSecretary,
        expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
      },
    })
    await screen.findByRole('heading', { name: 'Horarios e inscripciones' })
    expect(
      screen.queryByRole('link', { name: 'Inscribir alumno' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Editar cursada' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Ver inscripciones' }))
    await screen.findByRole('table', { name: 'Inscripciones' })
    expect(
      screen.queryByRole('link', { name: 'Crear inscripción' }),
    ).not.toBeInTheDocument()
    await waitFor(() =>
      expect(academicServices.inscripciones.list).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { cursadaId: 'cursada-mat1-a' } }),
        expect.any(AbortSignal),
      ),
    )
  })
})
