import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { PageHeading } from '../../components/ui/PageHeading'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { toApiError } from '../../lib/api-error'
import { formatDate } from '../../utils/date'
import { Can } from '../auth/Can'
import { catalog, displayValue, moduleFor, recordLabel } from './catalog'
import type { AcademicDomain } from './schemas'
import { CourseDetails } from '../cursadas/CourseDetails'
import { GestionDetails } from '../gestion/GestionDetails'
import {
  AcademicError,
  AcademicLoading,
  AcademicNotice,
} from './AcademicFeedback'
import {
  useAcademicLookups,
  useAcademicMutations,
  useAcademicRecord,
} from './use-academic'

export function AcademicDetailPage({ domain }: { domain: AcademicDomain }) {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const query = useAcademicRecord(domain, id)
  const lookups = useAcademicLookups(domain)
  const { remove } = useAcademicMutations(domain)
  const error = query.error ?? lookups.error
  const record = query.data
  return (
    <>
      <Link
        to={`/${domain}`}
        className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4"
      >
        Volver a {moduleFor(domain).label.toLocaleLowerCase('es-AR')}
      </Link>
      <PageHeading
        title={`Detalle de ${catalog[domain].singular}`}
        description={
          record
            ? recordLabel(record, lookups.data)
            : 'Consulta del registro administrativo.'
        }
      />
      <AcademicNotice />
      {searchParams.get('guardado') === '1' && (
        <p role="status" className="mb-4 text-sm font-medium text-brand-700">
          Cambios guardados correctamente.
        </p>
      )}
      {error ? (
        <AcademicError
          error={error}
          pending={query.isFetching || lookups.isFetching}
          retry={() => {
            void query.refetch()
            void lookups.refetch()
          }}
        />
      ) : query.isPending || lookups.isPending || !record ? (
        <AcademicLoading />
      ) : (
        <>
          <dl className="grid gap-x-8 gap-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-3">
            {catalog[domain].fields.map((field) => (
              <div
                key={field.name}
                className={
                  field.type === 'textarea' || field.type === 'multiple'
                    ? 'min-w-0 sm:col-span-2'
                    : 'min-w-0'
                }
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {field.label}
                </dt>
                <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                  {displayValue(field, record, lookups.data ?? {})}
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Creado
              </dt>
              <dd className="mt-2 text-sm">{formatDate(record.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Última modificación
              </dt>
              <dd className="mt-2 text-sm">{formatDate(record.updatedAt)}</dd>
            </div>
          </dl>
          {'horarios' in record && (
            <CourseDetails course={record} lookups={lookups.data ?? {}} />
          )}
          <GestionDetails record={record} lookups={lookups.data ?? {}} />
          <div className="mt-6 flex flex-wrap gap-3">
            <Can permission="update">
              <Link
                className="button-primary"
                to={`/${domain}/${record.id}/editar`}
              >
                Editar {catalog[domain].singular}
              </Link>
            </Can>
            <Can permission="delete">
              <button
                type="button"
                className="button-secondary text-red-700"
                onClick={() => {
                  remove.reset()
                  setConfirmOpen(true)
                }}
              >
                Dar de baja
              </button>
              <ConfirmDialog
                open={confirmOpen}
                title="Dar de baja el registro"
                description={`Se dará de baja lógicamente a «${recordLabel(record, lookups.data)}». Dejará de aparecer en las consultas. El registro se conserva; no se elimina de forma permanente.`}
                pending={remove.isPending}
                error={
                  remove.error ? toApiError(remove.error).message : undefined
                }
                onCancel={() => setConfirmOpen(false)}
                onConfirm={() => {
                  void remove
                    .mutateAsync(record.id)
                    .then(() => {
                      void navigate(`/${domain}?baja=1`, { replace: true })
                    })
                    .catch(() => {
                      /* El error de la mutación se muestra en el diálogo. */
                    })
                }}
              />
            </Can>
          </div>
        </>
      )}
    </>
  )
}
