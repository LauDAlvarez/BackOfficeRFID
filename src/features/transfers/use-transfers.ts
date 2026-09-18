import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePermissions } from '../auth/use-permissions'
import type { Permission } from '../auth/permissions'
import { ApiError } from '../../lib/api-error'
import { transferService } from '../../services/transfers'
import type { AcademicDomain } from '../academic/schemas'
import type { ListParams } from '../../services/academic-service'
import type { ImportDomain, ImportTable, TransferFormat } from './contracts'
import { createImportTemplate, parseImportFile } from './files'
import { downloadFile } from './download'

function useTransferRequest() {
  const { can } = usePermissions()
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  return (permission: Permission): AbortSignal => {
    if (!can(permission))
      throw new ApiError(
        'No tenés permiso para realizar esta operación.',
        403,
      )
    controller.current?.abort()
    controller.current = new AbortController()
    return controller.current.signal
  }
}
export function useExport(domain: AcademicDomain) {
  const begin = useTransferRequest()
  return useMutation({
    mutationFn: async ({
      params,
      format,
    }: {
      params: ListParams
      format: TransferFormat
    }) => {
      const signal = begin(format === 'csv' ? 'exportCsv' : 'exportExcel')
      const file = await transferService.export(
        domain,
        params,
        format,
        signal,
      )
      signal.throwIfAborted()
      downloadFile(file)
      return file.filename
    },
    gcTime: 0,
  })
}
export function useImport(domain: ImportDomain) {
  const begin = useTransferRequest()
  const client = useQueryClient()
  const preview = useMutation({
    mutationFn: async (file: File) => {
      const signal = begin('import')
      const table = await parseImportFile(file)
      signal.throwIfAborted()
      const result = await transferService.preview(domain, table, signal)
      signal.throwIfAborted()
      return { table, preview: result }
    },
    gcTime: 0,
  })
  const commit = useMutation({
    mutationFn: async (table: ImportTable) => {
      const signal = begin('import')
      const result = await transferService.commit(domain, table, signal)
      signal.throwIfAborted()
      return result
    },
    onSuccess: async (result) => {
      if (result.status === 'IMPORTED')
        await client.invalidateQueries({ queryKey: ['academic'] })
    },
    gcTime: 0,
  })
  const template = useMutation({
    mutationFn: async (format: TransferFormat) => {
      const signal = begin('import')
      const file = await createImportTemplate(domain, format)
      signal.throwIfAborted()
      downloadFile(file)
    },
    gcTime: 0,
  })
  return { preview, commit, template }
}
