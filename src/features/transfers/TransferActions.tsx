import { Link } from 'react-router'
import { Can } from '../auth/Can'
import type { AcademicDomain } from '../academic/schemas'
import type { ListParams } from '../../services/academic-service'
import { toApiError } from '../../lib/api-error'
import { isImportDomain } from './contracts'
import { useExport } from './use-transfers'

export function TransferActions({
  domain,
  params,
  disabled,
}: {
  domain: AcademicDomain
  params: ListParams
  disabled: boolean
}) {
  const task = useExport(domain)
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        {isImportDomain(domain) && (
          <Can permission="import">
            <Link className="button-secondary" to={`/${domain}/importar`}>
              Importar {domain}
            </Link>
          </Can>
        )}
        <Can permission="exportCsv">
          <button
            type="button"
            className="button-secondary"
            disabled={disabled || task.isPending}
            onClick={() => task.mutate({ params, format: 'csv' })}
          >
            Exportar CSV
          </button>
        </Can>
        <Can permission="exportExcel">
          <button
            type="button"
            className="button-secondary"
            disabled={disabled || task.isPending}
            onClick={() => task.mutate({ params, format: 'xlsx' })}
          >
            Exportar Excel
          </button>
        </Can>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        La exportación incluye todas las páginas con los filtros y el orden
        actuales.
      </p>
      {task.isPending && (
        <p role="status" className="mt-3 text-sm">
          Preparando archivo…
        </p>
      )}
      {task.isSuccess && (
        <p role="status" className="mt-3 break-words text-sm text-brand-700">
          Archivo preparado: {task.data}.
        </p>
      )}
      {task.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {toApiError(task.error).message}
        </p>
      )}
    </div>
  )
}
