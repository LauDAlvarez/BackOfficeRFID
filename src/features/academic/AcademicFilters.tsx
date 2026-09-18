import { useState } from 'react'
import { TextField } from '../../components/forms/TextField'
import { SelectField } from '../../components/forms/SelectField'
import type { ListParams } from '../../services/academic-service'
import { catalog, recordLabel, type Lookups } from './catalog'
import { fieldValue, type AcademicDomain } from './schemas'

export function AcademicFilters({
  domain,
  params,
  lookups,
  onChange,
}: {
  domain: AcademicDomain
  params: ListParams
  lookups: Lookups
  onChange: (params: ListParams) => void
}) {
  const [search, setSearch] = useState(params.search)
  const definition = catalog[domain]
  const state = definition.fields.find((field) => field.name === 'estado')!
  return (
    <form
      role="search"
      aria-label="Buscar y filtrar registros"
      className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault()
        onChange({ ...params, search: search.trim(), page: 1 })
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <TextField
            label="Buscar"
            type="search"
            placeholder="Nombre, código o identificador…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button className="button-primary" type="submit">
          Buscar
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            setSearch('')
            onChange({
              ...params,
              search: '',
              estado: '',
              filters: {},
              page: 1,
            })
          }}
        >
          Limpiar filtros
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label="Filtrar por estado"
          value={params.estado}
          onChange={(event) =>
            onChange({ ...params, estado: event.target.value, page: 1 })
          }
        >
          <option value="">Todos los estados</option>
          {state.choices?.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </SelectField>
        {definition.filters.map((key) => {
          const field = definition.fields.find((item) => item.name === key)!
          if (field.type === 'date' || field.type === 'number')
            return (
              <TextField
                key={key}
                label={`Filtrar por ${field.label.toLocaleLowerCase('es-AR')}`}
                type={field.type}
                value={params.filters[key] ?? ''}
                onChange={(event) =>
                  onChange({
                    ...params,
                    filters: { ...params.filters, [key]: event.target.value },
                    page: 1,
                  })
                }
              />
            )
          const choices = field.relation
            ? (lookups[field.relation] ?? [])
                .filter(
                  (record) =>
                    !field.dependsOn ||
                    !params.filters[field.dependsOn] ||
                    fieldValue(record, field.relationParent!) ===
                      params.filters[field.dependsOn],
                )
                .map((record) => ({
                  value: record.id,
                  label: recordLabel(record, lookups),
                }))
            : (field.choices ?? [])
          return (
            <SelectField
              key={key}
              label={`Filtrar por ${field.label.toLocaleLowerCase('es-AR')}`}
              value={params.filters[key] ?? ''}
              onChange={(event) => {
                const filters = {
                  ...params.filters,
                  [key]: event.target.value,
                }
                definition.fields
                  .filter((item) => item.dependsOn === key)
                  .forEach((item) => {
                    delete filters[item.name]
                  })
                onChange({ ...params, filters, page: 1 })
              }}
            >
              <option value="">Todas las opciones</option>
              {choices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </SelectField>
          )
        })}
      </div>
    </form>
  )
}
