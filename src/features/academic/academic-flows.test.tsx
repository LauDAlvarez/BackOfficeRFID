import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/render-app'
import { academicServices } from '../../services/academic'
import { mockAcademicServices } from '../../test/mock-academic-services'
import { createAcademicData } from '../../mocks/academic-data'
import { academicDomains, type AcademicRecord } from './schemas'
import { mockSecretary, MOCK_SESSION_DURATION } from '../../mocks/auth-service'
import { ApiError } from '../../lib/api-error'
import type { Page } from '../../services/academic-service'

const secretarySession = () => ({
  user: mockSecretary,
  expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
})
beforeEach(() => {
  mockAcademicServices()
})

describe('Listados académicos', () => {
  it('busca, filtra, ordena y pagina sin mezclar resultados', async () => {
    const user = userEvent.setup()
    await renderApp('/alumnos')
    await screen.findByText('1–10 de 14 registros')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('11–14 de 14 registros')
    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'INACTIVO',
    )
    await screen.findByText('1–1 de 1 registros')
    expect(screen.getByText('Pérez')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await screen.findByText('1–10 de 14 registros')
    await user.click(
      screen.getByRole('button', { name: 'Ordenar por apellido' }),
    )
    await waitFor(() =>
      expect(
        within(screen.getByRole('table')).getAllByRole('row')[1],
      ).toHaveTextContent('Pérez'),
    )
    await user.type(screen.getByLabelText('Buscar'), 'alvarez')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await screen.findByText('1–1 de 1 registros')
    expect(screen.getByText('Álvarez')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Buscar'))
    await user.type(screen.getByLabelText('Buscar'), 'no existe')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await screen.findByText('No hay registros para mostrar')
  })
  it('muestra carga, un error recuperable y resultados vacíos', async () => {
    let resolve: (page: Page<AcademicRecord>) => void = () => {}
    vi.mocked(academicServices.sedes.list).mockReturnValueOnce(
      new Promise((res) => {
        resolve = res
      }),
    )
    await renderApp('/sedes')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando registros')
    await act(async () => {
      resolve({ data: [], total: 0, page: 1, pageSize: 10 })
    })
    await screen.findByText('No hay registros para mostrar')
    vi.mocked(academicServices.sedes.list).mockRejectedValueOnce(
      new ApiError('No hay conexión.'),
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Buscar'), 'central')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay conexión.',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByText('Sede Central')
  })
})

describe('Edición y bajas académicas', () => {
  it('crea, abre detalle, edita estado y confirma una baja lógica', async () => {
    const user = userEvent.setup()
    await renderApp('/comisiones/nuevo')
    await user.type(await screen.findByLabelText('Nombre'), 'Turno de prueba')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de comisión' })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cambios guardados',
    )
    await user.click(screen.getByRole('link', { name: 'Editar comisión' }))
    await user.selectOptions(await screen.findByLabelText('Estado'), 'INACTIVO')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de comisión' })
    expect(await screen.findByText('Inactivo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Dar de baja el registro',
    })
    expect(dialog).toHaveTextContent('no se elimina de forma permanente')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(academicServices.comisiones.softDelete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }))
    await user.click(
      screen.getByRole('button', { name: 'Confirmar baja lógica' }),
    )
    await screen.findByRole('table', { name: 'Comisiones' })
    expect(screen.queryByText('Turno de prueba')).not.toBeInTheDocument()
    expect(academicServices.comisiones.softDelete).toHaveBeenCalledOnce()
  })
  it('conserva el formulario ante errores de guardado y permite reintentar', async () => {
    vi.mocked(academicServices.sedes.create).mockRejectedValueOnce(
      new ApiError('No se pudo guardar.'),
    )
    const user = userEvent.setup()
    await renderApp('/sedes/nuevo')
    await user.type(await screen.findByLabelText('Nombre'), 'Sede de prueba')
    await user.type(screen.getByLabelText('Dirección'), 'Dirección demo 300')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo guardar.',
    )
    expect(screen.getByLabelText('Nombre')).toHaveValue('Sede de prueba')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de sede' })
    expect(academicServices.sedes.create).toHaveBeenCalledTimes(2)
  })
  it('impide bajas con referencias y muestra un error sin ocultar el registro', async () => {
    const user = userEvent.setup()
    await renderApp('/sedes/sede-central')
    await user.click(await screen.findByRole('button', { name: 'Dar de baja' }))
    await user.click(
      screen.getByRole('button', { name: 'Confirmar baja lógica' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'registros vinculados',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await academicServices.sedes.get('sede-central')).toMatchObject({
      deletedAt: null,
    })
  })
  it('maneja detalles inexistentes con regreso al listado', async () => {
    await renderApp('/alumnos/no-existe')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no está disponible',
    )
    expect(
      screen.getByRole('link', { name: 'Volver a alumnos' }),
    ).toHaveAttribute('href', '/alumnos')
  })
  it('valida capacidad y limpia edificio al cambiar de sede', async () => {
    const user = userEvent.setup()
    await renderApp('/aulas/nuevo')
    await user.type(await screen.findByLabelText('Número'), '999')
    await user.selectOptions(screen.getByLabelText('Sede'), 'sede-central')
    await user.selectOptions(
      screen.getByLabelText('Edificio'),
      'edificio-central',
    )
    await user.selectOptions(screen.getByLabelText('Sede'), 'sede-norte')
    expect(screen.getByLabelText('Edificio')).toHaveValue('')
    expect(
      screen.queryByRole('option', { name: 'Edificio Académico' }),
    ).not.toBeInTheDocument()
    await user.selectOptions(
      screen.getByLabelText('Edificio'),
      'edificio-norte',
    )
    fireEvent.change(screen.getByLabelText('Capacidad máxima'), {
      target: { value: '0' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('mayor a cero')
    expect(academicServices.aulas.create).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Capacidad máxima'), {
      target: { value: '42' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de aula' })
    expect(academicServices.aulas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        capacidadMaxima: 42,
        edificioId: 'edificio-norte',
        sedeId: 'sede-norte',
        estado: 'ACTIVA',
      }),
    )
  })
  it('mantiene carrera y plan coherentes y detecta duplicados del alumno', async () => {
    const user = userEvent.setup()
    await renderApp('/alumnos/alumno-1/editar')
    await user.selectOptions(
      await screen.findByLabelText('Carrera'),
      'carrera-administracion',
    )
    expect(screen.getByLabelText('Plan de estudio')).toHaveValue('')
    expect(
      screen.queryByRole('option', { name: /SIS-2026/ }),
    ).not.toBeInTheDocument()
    await user.selectOptions(
      screen.getByLabelText('Plan de estudio'),
      'plan-adm-2026',
    )
    fireEvent.change(screen.getByLabelText('DNI'), {
      target: { value: '40000002' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('DNI')
    fireEvent.change(screen.getByLabelText('DNI'), {
      target: { value: '40000001' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de alumno' })
    expect(
      await screen.findByText('ADM-2026 · Plan Administración 2026'),
    ).toBeInTheDocument()
  })
  it('exige planes de materia y guarda múltiples relaciones con correlativas simples', async () => {
    const user = userEvent.setup()
    await renderApp('/materias/nuevo')
    await user.type(await screen.findByLabelText('Código'), 'MAT3')
    await user.type(screen.getByLabelText('Nombre'), 'Matemática III')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'al menos un plan',
    )
    await user.click(screen.getByRole('checkbox', { name: /SIS-2026/ }))
    await user.click(screen.getByRole('checkbox', { name: /ADM-2026/ }))
    await user.click(
      screen.getByRole('checkbox', { name: 'MAT1 · Matemática I' }),
    )
    await user.selectOptions(screen.getByLabelText('Cuatrimestre'), '2')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Detalle de materia' })
    expect(academicServices.materias.create).toHaveBeenCalledWith(
      expect.objectContaining({
        planEstudioIds: ['plan-sis-2026', 'plan-adm-2026'],
        correlativaIds: ['materia-mat1'],
        cuatrimestre: 2,
      }),
    )
  })
})

describe('Permisos en el núcleo académico', () => {
  it.each(academicDomains)(
    'Secretaría consulta %s sin acciones de escritura',
    async (domain) => {
      const user = userEvent.setup()
      await renderApp(`/${domain}`, { session: secretarySession() })
      await screen.findByRole('table')
      expect(
        screen.queryByRole('link', { name: /^Crear / }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: /^Editar / }),
      ).not.toBeInTheDocument()
      await user.click(
        screen.getAllByRole('link', { name: /^Ver detalle de / })[0]!,
      )
      await screen.findByRole('heading', { name: /^Detalle de / })
      expect(
        screen.queryByRole('button', { name: 'Dar de baja' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: /^Editar / }),
      ).not.toBeInTheDocument()
    },
  )
  it.each(academicDomains)(
    'bloquea la URL de creación de %s para Secretaría',
    async (domain) => {
      await renderApp(`/${domain}/nuevo`, { session: secretarySession() })
      expect(screen.getByRole('alert')).toHaveTextContent('No tenés acceso')
      expect(academicServices[domain].create).not.toHaveBeenCalled()
      expect(
        screen.queryByRole('button', { name: 'Guardar cambios' }),
      ).not.toBeInTheDocument()
    },
  )
  it.each(academicDomains)(
    'bloquea la URL de edición de %s para Secretaría',
    async (domain) => {
      const record = createAcademicData()[domain][0]!
      await renderApp(`/${domain}/${record.id}/editar`, {
        session: secretarySession(),
      })
      expect(screen.getByRole('alert')).toHaveTextContent('No tenés acceso')
      expect(academicServices[domain].update).not.toHaveBeenCalled()
      expect(
        screen.queryByRole('button', { name: 'Guardar cambios' }),
      ).not.toBeInTheDocument()
    },
  )
})
