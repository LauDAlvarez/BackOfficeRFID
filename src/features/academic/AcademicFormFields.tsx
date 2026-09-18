import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { TextField } from '../../components/forms/TextField'
import { SelectField } from '../../components/forms/SelectField'
import {
  catalog,
  recordLabel,
  type FieldDefinition,
  type Lookups,
} from './catalog'
import {
  fieldValue,
  type AcademicDomain,
  type AcademicInput,
} from './schemas'
import { ScheduleFields } from '../cursadas/ScheduleFields'
import { EnrollmentContext } from '../cursadas/EnrollmentContext'
import { GestionFormContext } from '../gestion/GestionFormContext'
import { scheduleLabel } from '../gestion/presentation'

function AcademicFormField({
  field,
  domain,
  lookups,
  recordId,
}: {
  field: FieldDefinition
  domain: AcademicDomain
  lookups: Lookups
  recordId: string | undefined
}) {
  const { register, control, setValue, getFieldState, formState } =
    useFormContext<AcademicInput>()
  const parentValue = useWatch({
    control,
    name: field.dependsOn ?? field.name,
  })
  const courseId = useWatch({ control, name: 'cursadaId' })
  const evaluationId = useWatch({ control, name: 'evaluacionId' })
  const evaluation = lookups.evaluaciones?.find(
    (row) => row.id === evaluationId,
  )
  const selectedCourseId =
    domain === 'resultados' && evaluation && 'cursadaId' in evaluation
      ? evaluation.cursadaId
      : courseId
  const error = getFieldState(field.name, formState).error?.message
  const label = `${field.label}${field.optional ? ' (opcional)' : ''}`
  const id = `academic-${field.name}`
  const course = lookups.cursadas?.find((row) => row.id === courseId)
  const choices =
    field.name === 'horarioCursadaId'
      ? course && 'horarios' in course
        ? course.horarios.map((row) => ({
            value: row.id,
            label: scheduleLabel(course.id, row.id, lookups),
          }))
        : []
      : field.relation
        ? (lookups[field.relation] ?? [])
            .filter(
              (row) =>
                !(field.name === 'correlativaIds' && row.id === recordId) &&
                (!(
                  field.name === 'alumnoId' &&
                  (domain === 'asistencia' || domain === 'resultados')
                ) ||
                  lookups.inscripciones?.some(
                    (enrollment) =>
                      'condicionAcademica' in enrollment &&
                      !enrollment.deletedAt &&
                      enrollment.cursadaId === selectedCourseId &&
                      enrollment.alumnoId === row.id,
                  )) &&
                (!field.dependsOn ||
                  fieldValue(row, field.relationParent!) === parentValue),
            )
            .map((row) => ({
              value: row.id,
              label: `${recordLabel(row, lookups)}${row.estado === 'INACTIVO' || row.estado === 'INACTIVA' ? ' (inactivo)' : ''}`,
            }))
        : (field.choices ?? [])
  if (field.readOnly) {
    if (field.name === 'estado') return null
    return (
      <TextField
        label={label}
        id={id}
        value={
          field.choices?.find((choice) => choice.value === parentValue)
            ?.label ?? String(parentValue ?? '')
        }
        readOnly
      />
    )
  }
  if (field.type === 'multiple')
    return (
      <fieldset
        className="min-w-0 rounded-lg border border-slate-200 p-4 sm:col-span-2"
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <legend className="px-1 text-sm font-medium text-slate-700">
          {label}
        </legend>
        {field.maxSelections && (
          <p className="mb-3 text-sm text-slate-600">
            Seleccioná hasta {field.maxSelections} profesores.
          </p>
        )}
        <Controller
          name={field.name}
          control={control}
          render={({ field: input }) => (
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {choices.length ? (
                choices.map((choice, index) => (
                  <label
                    key={choice.value}
                    className="flex min-h-11 items-start gap-3 rounded px-2 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      ref={index === 0 ? input.ref : undefined}
                      name={input.name}
                      disabled={
                        field.maxSelections !== undefined &&
                        Array.isArray(input.value) &&
                        input.value.length >= field.maxSelections &&
                        !input.value.includes(choice.value)
                      }
                      checked={
                        Array.isArray(input.value) &&
                        input.value.includes(choice.value)
                      }
                      onBlur={input.onBlur}
                      aria-invalid={Boolean(error)}
                      className="mt-1 size-4 shrink-0 accent-brand-700"
                      onChange={(event) => {
                        const selected = Array.isArray(input.value)
                          ? input.value
                          : []
                        input.onChange(
                          event.target.checked
                            ? [...selected, choice.value]
                            : selected.filter(
                                (value) => value !== choice.value,
                              ),
                        )
                      }}
                    />
                    <span className="break-words">{choice.label}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No hay opciones disponibles. Podés crearlas en el módulo
                  correspondiente.
                </p>
              )}
            </div>
          )}
        />
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </fieldset>
    )
  if (field.type === 'textarea')
    return (
      <div className="min-w-0 sm:col-span-2">
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
        <textarea
          id={id}
          rows={4}
          {...register(field.name)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
        />
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </div>
    )
  if (field.type === 'select')
    return (
      <SelectField
        label={label}
        id={id}
        error={error}
        {...register(field.name, {
          ...(field.name === 'cuatrimestre' ? { valueAsNumber: true } : {}),
          onChange: () => {
            if (
              (domain === 'asistencia' && field.name === 'cursadaId') ||
              (domain === 'resultados' && field.name === 'evaluacionId')
            )
              setValue('alumnoId', '', { shouldDirty: true })
            catalog[domain].fields
              .filter((item) => item.dependsOn === field.name)
              .forEach((item) =>
                setValue(item.name, '', {
                  shouldValidate: false,
                  shouldDirty: true,
                }),
              )
          },
        })}
      >
        <option value="">Seleccionar…</option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </SelectField>
    )
  return (
    <TextField
      label={label}
      type={field.type ?? 'text'}
      id={id}
      error={error}
      step={field.type === 'number' ? (field.step ?? 1) : undefined}
      {...register(field.name, { valueAsNumber: field.type === 'number' })}
    />
  )
}
export function AcademicFormFields({
  domain,
  lookups,
  recordId,
}: {
  domain: AcademicDomain
  lookups: Lookups
  recordId: string | undefined
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {catalog[domain].fields.map((field) => (
          <AcademicFormField
            key={field.name}
            domain={domain}
            field={field}
            lookups={lookups}
            recordId={recordId}
          />
        ))}
      </div>
      {domain === 'cursadas' && (
        <ScheduleFields lookups={lookups} courseId={recordId} />
      )}
      {domain === 'inscripciones' && (
        <EnrollmentContext lookups={lookups} recordId={recordId} />
      )}
      <GestionFormContext domain={domain} />
    </>
  )
}
