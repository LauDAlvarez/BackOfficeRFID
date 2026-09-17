import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField } from '../components/forms/TextField'
import { Icon } from '../components/ui/Icon'
import { PageHeading } from '../components/ui/PageHeading'
import { StatePanel } from '../components/ui/StatePanel'
import { moduleGroups } from '../router/modules'
import { usePermissions } from '../features/auth/use-permissions'
import {
  moduleSearchSchema,
  type ModuleSearchValues,
} from '../schemas/module-search'
import { normalizeSearch } from '../utils/text'

export function HomePage() {
  const { accessibleModules } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('buscar') ?? ''
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ModuleSearchValues>({
    resolver: zodResolver(moduleSearchSchema),
    defaultValues: { search },
  })

  useEffect(() => {
    reset({ search })
  }, [search, reset])

  const matches = accessibleModules.filter((module) =>
    normalizeSearch(`${module.label} ${module.description}`).includes(
      normalizeSearch(search),
    ),
  )
  const submitSearch = ({ search: value }: ModuleSearchValues) =>
    setSearchParams(value ? { buscar: value } : {})

  return (
    <>
      <PageHeading
        eyebrow="Gestión institucional"
        title="Bienvenido al backoffice"
        description="Un espacio para organizar la vida académica de la facultad. Elegí un módulo para comenzar."
      />
      <div className="mb-8 flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-4 text-sm text-brand-700">
        <Icon name="info" className="mt-0.5 size-5 shrink-0" />
        <p className="leading-6">
          <span className="font-semibold">
            Estamos preparando este espacio.
          </span>{' '}
          Podés recorrer los módulos habilitados para tu perfil. La gestión de
          datos estará disponible en próximas etapas.
        </p>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            Módulos de gestión
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Acceso a las áreas de administración.
          </p>
        </div>
        <form
          role="search"
          aria-label="Buscar módulos"
          onSubmit={handleSubmit(submitSearch)}
          noValidate
          className="flex w-full flex-wrap items-start gap-2 sm:max-w-md"
        >
          <TextField
            label="Buscar un módulo"
            type="search"
            placeholder="Ej.: alumnos, aulas, materias"
            error={errors.search?.message}
            {...register('search')}
          />
          <button type="submit" className="button-primary mt-7">
            <Icon name="search" className="size-4" />
            <span>Buscar</span>
          </button>
        </form>
      </div>

      {search && (
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
          <p role="status" className="min-w-0 break-words text-slate-600">
            {matches.length}{' '}
            {matches.length === 1 ? 'módulo encontrado' : 'módulos encontrados'}{' '}
            para «{search}».
          </p>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="min-h-11 font-semibold text-brand-700 underline underline-offset-4"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}

      {matches.length === 0 ? (
        <StatePanel
          icon="search"
          title="No encontramos módulos"
          description="Probá con otro nombre o limpiá la búsqueda para ver todas las áreas."
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {moduleGroups.map((group) => {
            const groupModules = matches.filter(
              (module) => module.group === group.id,
            )
            if (!groupModules.length) return null
            return (
              <section
                key={group.id}
                aria-labelledby={`group-${group.id}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon name={group.icon} />
                  </span>
                  <div>
                    <h3
                      id={`group-${group.id}`}
                      className="font-semibold text-slate-800"
                    >
                      {group.label}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {group.description}
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {groupModules.map((module) => (
                    <li key={module.path}>
                      <Link
                        to={module.path}
                        className="group flex min-h-20 items-center justify-between gap-4 px-5 py-4 hover:bg-brand-50/70 focus-visible:-outline-offset-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-700 group-hover:text-brand-700">
                            {module.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {module.description}
                          </p>
                        </div>
                        <Icon
                          name="arrow"
                          className="size-4 shrink-0 text-slate-400 group-hover:text-brand-600"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
