import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockAcademicServices } from '../../test/mock-academic-services'
import { academicServices } from '../../services/academic'
import { createAcademicData } from '../../mocks/academic-data'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/auth-context'
import {
  createMockAuthService,
  mockSecretary,
  MOCK_SESSION_DURATION,
} from '../../mocks/auth-service'
import { useAcademicLookups, useAcademicMutations } from './use-academic'

beforeEach(() => {
  mockAcademicServices()
})

describe('Referencias paginadas', () => {
  const sede = createAcademicData().sedes[0]!
  it.each([
    {
      name: 'página repetida',
      data: [{ ...sede, id: 'otra' }],
      total: 2,
      page: 1,
    },
    {
      name: 'total modificado',
      data: [{ ...sede, id: 'otra' }],
      total: 3,
      page: 2,
    },
    { name: 'registro repetido', data: [sede], total: 2, page: 2 },
    { name: 'página incompleta', data: [], total: 2, page: 2 },
    {
      name: 'más registros que el total',
      data: [
        { ...sede, id: 'otra' },
        { ...sede, id: 'extra' },
      ],
      total: 2,
      page: 2,
    },
  ])(
    'detiene $name y permite reintentar sin entregar relaciones parciales',
    async ({ data, total, page }) => {
      vi.mocked(academicServices.sedes.list)
        .mockResolvedValueOnce({
          data: [sede],
          total: 2,
          page: 1,
          pageSize: 100,
        })
        .mockResolvedValueOnce({ data, total, page, pageSize: 100 })
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      })
      function Wrapper({ children }: PropsWithChildren) {
        return (
          <QueryClientProvider client={client}>
            {children}
          </QueryClientProvider>
        )
      }
      const { result } = renderHook(() => useAcademicLookups('edificios'), {
        wrapper: Wrapper,
      })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.data).toBeUndefined()
      expect(result.current.error?.message).toContain('Volvé a intentarlo')
      expect(academicServices.sedes.list).toHaveBeenCalledTimes(2)
      await act(async () => {
        await result.current.refetch()
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.sedes).toHaveLength(2)
    },
  )
})

describe('Permisos de mutaciones académicas', () => {
  it('Secretaría no puede crear, editar ni dar de baja invocando el hook directamente', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    const service = createMockAuthService({
      initialSession: {
        user: mockSecretary,
        expiresAt: new Date(Date.now() + MOCK_SESSION_DURATION).toISOString(),
      },
    })
    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={client}>
          <AuthProvider service={service}>{children}</AuthProvider>
        </QueryClientProvider>
      )
    }
    const { result } = renderHook(
      () => ({ task: useAcademicMutations('sedes'), state: useAuth().state }),
      { wrapper: Wrapper },
    )
    await waitFor(() =>
      expect(result.current.state.status).toBe('authenticated'),
    )
    const input = {
      nombre: 'Sede',
      direccion: 'Dirección 123',
      estado: 'ACTIVO' as const,
    }
    await act(async () => {
      await expect(
        result.current.task.save.mutateAsync({ input }),
      ).rejects.toMatchObject({ status: 403 })
      await expect(
        result.current.task.save.mutateAsync({ id: 'sede-central', input }),
      ).rejects.toMatchObject({ status: 403 })
      await expect(
        result.current.task.remove.mutateAsync('sede-central'),
      ).rejects.toMatchObject({ status: 403 })
    })
    expect(academicServices.sedes.create).not.toHaveBeenCalled()
    expect(academicServices.sedes.update).not.toHaveBeenCalled()
    expect(academicServices.sedes.softDelete).not.toHaveBeenCalled()
  })
})
