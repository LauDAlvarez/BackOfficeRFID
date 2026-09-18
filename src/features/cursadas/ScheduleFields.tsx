import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { TextField } from '../../components/forms/TextField'
import { SelectField } from '../../components/forms/SelectField'
import type { AcademicInput } from '../academic/schemas'
import type { Lookups } from '../academic/catalog'
import { weekDays } from './schemas'
import { aulaLabel } from './presentation'
import { activeEnrollmentCount, courseCapacity } from './rules'

export function ScheduleFields({
  lookups,
  courseId,
}: {
  lookups: Lookups
  courseId?: string | undefined
}) {
  const { control, register, getFieldState, formState } =
    useFormContext<AcademicInput>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'horarios',
    keyName: 'formKey',
  })
  const horarios = useWatch({ control, name: 'horarios' }) ?? []
  const capacity = courseCapacity({ horarios }, lookups)
  const count = courseId ? activeEnrollmentCount(courseId, lookups) : 0
  const error = getFieldState('horarios', formState).error
  const message = error?.message ?? error?.root?.message
  const aulas = (lookups.aulas ?? []).filter((row) => 'capacidadMaxima' in row)
  return (
    <section
      className="mt-7 min-w-0 border-t border-slate-200 pt-6"
      aria-labelledby="schedule-title"
    >
      <h2 id="schedule-title" className="text-lg font-semibold text-brand-900">
        Horarios semanales
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Agregá al menos un horario. Cada encuentro puede realizarse en un aula
        diferente. Horas locales de Córdoba.
      </p>
      <p className="mt-2 text-sm text-slate-600" aria-live="polite">
        {capacity === null
          ? 'Seleccioná las aulas para calcular el cupo.'
          : `Cupo según aulas: ${capacity} alumnos.`}{' '}
        Inscripciones activas: {count}.
      </p>
      {message && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {message}
        </p>
      )}
      <div className="mt-5 space-y-4">
        {fields.map((field, index) => (
          <fieldset
            key={field.formKey}
            className="min-w-0 rounded-lg border border-slate-200 p-4"
          >
            <legend className="px-1 text-sm font-semibold">
              Horario {index + 1}
            </legend>
            <input type="hidden" {...register(`horarios.${index}.id`)} />
            <div className="grid min-w-0 gap-4 sm:grid-cols-3">
              <SelectField
                label="Día de la semana"
                {...register(`horarios.${index}.diaSemana`, {
                  valueAsNumber: true,
                })}
                error={
                  getFieldState(`horarios.${index}.diaSemana`, formState).error
                    ?.message
                }
              >
                {weekDays.map((day) => (
                  <option value={day.value} key={day.value}>
                    {day.label}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Hora de inicio"
                type="time"
                {...register(`horarios.${index}.horaInicio`)}
                error={
                  getFieldState(`horarios.${index}.horaInicio`, formState).error
                    ?.message
                }
              />
              <TextField
                label="Hora de fin"
                type="time"
                {...register(`horarios.${index}.horaFin`)}
                error={
                  getFieldState(`horarios.${index}.horaFin`, formState).error
                    ?.message
                }
              />
              <div className="min-w-0 sm:col-span-3">
                <SelectField
                  label="Aula"
                  {...register(`horarios.${index}.aulaId`)}
                  error={
                    getFieldState(`horarios.${index}.aulaId`, formState).error
                      ?.message
                  }
                >
                  <option value="">Seleccionar aula…</option>
                  {aulas.map((aula) => (
                    <option key={aula.id} value={aula.id}>
                      {aulaLabel(aula, lookups)}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
            <button
              type="button"
              className="button-secondary mt-4"
              onClick={() => remove(index)}
              aria-label={`Quitar horario ${index + 1}`}
            >
              Quitar horario
            </button>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        className="button-secondary mt-4"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            diaSemana: 1,
            horaInicio: '',
            horaFin: '',
            aulaId: '',
          })
        }
      >
        Agregar horario
      </button>
    </section>
  )
}
