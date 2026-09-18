import { useFormContext, useWatch } from 'react-hook-form'
import type { AcademicDomain, AcademicInput } from '../academic/schemas'
import { choiceLabel } from './catalog'
import { feeState, resultState } from './schemas'

export function GestionFormContext({ domain }: { domain: AcademicDomain }) {
  const { control } = useFormContext<AcademicInput>()
  const values = useWatch({ control })
  if (domain === 'resultados' && 'nota' in values)
    return (
      <p role="status" className="mt-5 text-sm text-slate-600">
        Resultado calculado:{' '}
        {typeof values.nota === 'number' &&
        Number.isFinite(values.nota) &&
        values.nota >= 0 &&
        values.nota <= 10
          ? choiceLabel(resultState(values.nota))
          : 'Ingresá una nota de 0 a 10'}
        . La aprobación requiere al menos 6. La condición académica se
        administra en Inscripciones.
      </p>
    )
  if (domain === 'cuotas' && 'fechaVencimiento' in values)
    return (
      <p role="status" className="mt-5 text-sm text-slate-600">
        Estado calculado:{' '}
        {values.fechaVencimiento
          ? choiceLabel(
              feeState({
                fechaVencimiento: values.fechaVencimiento,
                fechaPago: values.fechaPago ?? '',
              }),
            )
          : 'Completá el vencimiento'}
        . Para registrar un pago, completá su fecha; para corregirlo, modificá
        o vaciá ese campo.
      </p>
    )
  if (domain === 'asistencia')
    return (
      <p className="mt-5 text-sm text-slate-600">
        Los registros nuevos son manuales. Una corrección conserva el origen y
        actualiza la fecha de modificación.
      </p>
    )
  return null
}
