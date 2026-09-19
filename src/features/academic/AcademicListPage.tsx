import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageHeading } from '../../components/ui/PageHeading'
import { StatePanel } from '../../components/ui/StatePanel'
import { DataTable } from '../../components/tables/DataTable'
import { Pagination } from '../../components/tables/Pagination'
import { Can } from '../auth/Can'
import { catalog, displayValue, moduleFor, recordLabel } from './catalog'
import {
  type AcademicDomain,
  type AcademicField,
  type AcademicRecord,
} from './schemas'
import { AcademicFilters } from './AcademicFilters'
import {
  AcademicError,
  AcademicLoading,
  AcademicNotice,
} from './AcademicFeedback'
import {
  defaultListParams,
  useAcademicList,
  useAcademicLookups,
} from './use-academic'
import type { ListParams } from '../../services/academic-service'
import { TransferActions } from '../transfers/TransferActions'

export function AcademicListPage({ domain }: { domain: AcademicDomain }) {
  const [searchParams] = useSearchParams()
  const [params, setParams] = useState<ListParams>(() => ({
    ...defaultListParams(domain),
    filters: Object.fromEntries(
      catalog[domain].filters.flatMap((key) =>
        searchParams.get(key) ? [[key, searchParams.get(key)!]] : [],
      ),
    ),
  }))
  const query = useAcademicList(domain, params)
  const lookupQuery = useAcademicLookups(domain)
  const module = moduleFor(domain)
  const definition = catalog[domain]
  const lookups = lookupQuery.data ?? {}
  const error = query.error ?? lookupQuery.error
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-6">
        <PageHeading title={module.label} description={module.description} />
        <Can permission="create">
          <Link className="button-primary mb-6" to={`/${domain}/nuevo`}>
            Crear {definition.singular}
          </Link>
        </Can>
      </div>
      <AcademicNotice />
      {searchParams.get('baja') === '1' && (
        <p role="status" className="mb-4 text-sm font-medium text-brand-700">
          Registro dado de baja lógicamente.
        </p>
      )}
      <AcademicFilters
        domain={domain}
        params={params}
        lookups={lookups}
        onChange={setParams}
      />
      <TransferActions
        domain={domain}
        params={params}
        disabled={
          !query.data ||
          Boolean(error) ||
          query.isFetching ||
          lookupQuery.isPending
        }
      />
      {error ? (
        <AcademicError
          error={error}
          pending={query.isFetching || lookupQuery.isFetching}
          retry={() => {
            void query.refetch()
            void lookupQuery.refetch()
          }}
        />
      ) : !query.data || lookupQuery.isPending ? (
        <AcademicLoading />
      ) : (
        <>
          {query.isFetching && (
            <p role="status" className="mb-3 text-sm text-slate-600">
              Actualizando registros…
            </p>
          )}
          {query.data.data.length === 0 ? (
            <StatePanel
              title="No hay registros para mostrar"
              description="Probá con otros filtros o creá un registro si tu perfil lo permite."
            />
          ) : (
            <DataTable<AcademicRecord>
              caption={module.label}
              rows={query.data.data}
              columns={definition.columns.map((key) => {
                const field = definition.fields.find(
                  (item) => item.name === key,
                )!
                return {
                  key,
                  label: field.label,
                  render: (row) =>
                    key === 'estado' ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.estado === 'ACTIVO' || row.estado === 'ACTIVA' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {displayValue(field, row, lookups)}
                      </span>
                    ) : (
                      displayValue(field, row, lookups)
                    ),
                }
              })}
              sortBy={params.sortBy}
              sortOrder={params.sortOrder}
              onSort={(key) =>
                setParams({
                  ...params,
                  sortBy: key as AcademicField,
                  sortOrder:
                    params.sortBy === key && params.sortOrder === 'asc'
                      ? 'desc'
                      : 'asc',
                  page: 1,
                })
              }
              actions={(row) => (
                <div className="flex gap-3 whitespace-nowrap">
                  <Link
                    to={`/${domain}/${row.id}`}
                    aria-label={`Ver detalle de ${recordLabel(row, lookups)}`}
                    className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4"
                  >
                    Ver detalle
                  </Link>
                  <Can permission="update">
                    <Link
                      to={`/${domain}/${row.id}/editar`}
                      aria-label={`Editar ${recordLabel(row, lookups)}`}
                      className="inline-flex min-h-11 items-center text-slate-600 underline underline-offset-4"
                    >
                      Editar
                    </Link>
                  </Can>
                </div>
              )}
            />
          )}
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            onPage={(page) => setParams({ ...params, page })}
            onPageSize={(pageSize) =>
              setParams({ ...params, pageSize, page: 1 })
            }
          />
        </>
      )}
    </>
  )
}
