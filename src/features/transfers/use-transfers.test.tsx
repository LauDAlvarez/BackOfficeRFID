import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/auth-context'
import {
  createMockAuthService,
  mockSecretary,
  MOCK_SESSION_DURATION,
} from '../../mocks/auth-service'
import { transferService } from '../../services/transfers'
import { importFile, importTable } from '../../test/transfer-fixtures'
import { useImport } from './use-transfers'
import * as downloads from './download'

describe('Permisos también en hooks de transferencia', () => {
  it('rechaza validación, plantillas y confirmación de Secretaría aunque se invoquen directamente', async () => {
    const preview = vi.spyOn(transferService, 'preview')
    const commit = vi.spyOn(transferService, 'commit')
    const download = vi
      .spyOn(downloads, 'downloadFile')
      .mockImplementation(() => {})
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
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
      () => ({ task: useImport('alumnos'), state: useAuth().state }),
      { wrapper: Wrapper },
    )
    await waitFor(() =>
      expect(result.current.state.status).toBe('authenticated'),
    )
    await act(async () => {
      await expect(
        result.current.task.preview.mutateAsync(importFile('alumnos')),
      ).rejects.toMatchObject({ status: 403 })
      await expect(
        result.current.task.commit.mutateAsync(importTable('alumnos')),
      ).rejects.toMatchObject({ status: 403 })
      await expect(
        result.current.task.template.mutateAsync('xlsx'),
      ).rejects.toMatchObject({ status: 403 })
    })
    expect(preview).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
    expect(download).not.toHaveBeenCalled()
  })
})
