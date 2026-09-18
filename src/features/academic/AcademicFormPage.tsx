import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { PageHeading } from '../../components/ui/PageHeading'
import { toApiError } from '../../lib/api-error'
import { catalog, initialInputs, moduleFor, type Lookups } from './catalog'
import {
  inputSchemaFor,
  type AcademicDomain,
  type AcademicInput,
  type AcademicRecord,
} from './schemas'
import { relationIssues } from './relations'
import {
  useAcademicLookups,
  useAcademicMutations,
  useAcademicRecord,
} from './use-academic'
import {
  AcademicError,
  AcademicLoading,
  AcademicNotice,
} from './AcademicFeedback'
import { AcademicFormFields } from './AcademicFormFields'

function AcademicForm({
  domain,
  record,
  lookups,
}: {
  domain: AcademicDomain
  record: AcademicRecord | undefined
  lookups: Lookups
}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { save } = useAcademicMutations(domain)
  const schema = inputSchemaFor(domain).superRefine((input, context) => {
    relationIssues(domain, input, lookups, record?.id).forEach((issue) =>
      context.addIssue({
        code: 'custom',
        path: issue.path ?? [issue.field],
        message: issue.message,
      }),
    )
  })
  const form = useForm<AcademicInput>({
    resolver: zodResolver(schema),
    defaultValues: record ?? {
      ...initialInputs[domain],
      ...Object.fromEntries(
        catalog[domain].fields
          .filter((field) => field.relation && searchParams.has(field.name))
          .map((field) => [field.name, searchParams.get(field.name)]),
      ),
    },
  })
  const pending = form.formState.isSubmitting || save.isPending
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="max-w-4xl rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
        onSubmit={form.handleSubmit(async (input) => {
          form.clearErrors('root')
          try {
            const saved = await save.mutateAsync({ id: record?.id, input })
            void navigate(`/${domain}/${saved.id}?guardado=1`, {
              replace: true,
            })
          } catch (error) {
            form.setError('root.server', {
              message: toApiError(error).message,
            })
          }
        })}
      >
        <p className="mb-6 text-sm text-slate-500">
          Completá todos los campos salvo los indicados como opcionales.
        </p>
        <fieldset disabled={pending}>
          <legend className="sr-only">
            Datos de {catalog[domain].singular}
          </legend>
          <AcademicFormFields
            domain={domain}
            lookups={lookups}
            recordId={record?.id}
          />
        </fieldset>
        {form.formState.errors.root?.server?.message && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            {form.formState.errors.root.server.message}
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
          <button className="button-primary" disabled={pending} type="submit">
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={pending}
            onClick={() => {
              void navigate(record ? `/${domain}/${record.id}` : `/${domain}`)
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
export function AcademicFormPage({ domain }: { domain: AcademicDomain }) {
  const { id } = useParams()
  const query = useAcademicRecord(domain, id)
  const lookups = useAcademicLookups(domain)
  const error = query.error ?? lookups.error
  return (
    <>
      <Link
        to={`/${domain}`}
        className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4"
      >
        Volver a {moduleFor(domain).label.toLocaleLowerCase('es-AR')}
      </Link>
      <PageHeading
        title={`${id ? 'Editar' : 'Crear'} ${catalog[domain].singular}`}
        description="Información administrativa y relaciones académicas."
      />
      <AcademicNotice />
      {error ? (
        <AcademicError
          error={error}
          pending={query.isFetching || lookups.isFetching}
          retry={() => {
            if (id) void query.refetch()
            void lookups.refetch()
          }}
        />
      ) : (id && query.isPending) || lookups.isPending ? (
        <AcademicLoading />
      ) : (
        <AcademicForm
          key={`${domain}-${id ?? 'new'}`}
          domain={domain}
          record={query.data}
          lookups={lookups.data ?? {}}
        />
      )}
    </>
  )
}
