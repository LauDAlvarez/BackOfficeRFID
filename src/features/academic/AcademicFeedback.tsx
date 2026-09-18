import { StatePanel } from '../../components/ui/StatePanel'
import { toApiError } from '../../lib/api-error'
import { env } from '../../lib/env'

export function AcademicNotice() {
  return env.useMocks ? (
    <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
      Datos de demostración en memoria. Los cambios se pierden al recargar. No
      ingreses datos personales reales.
    </p>
  ) : null
}
export function AcademicLoading() {
  return (
    <StatePanel
      role="status"
      title="Cargando registros…"
      description="Estamos consultando la información disponible."
    />
  )
}
export function AcademicError({
  error,
  retry,
  pending = false,
}: {
  error: unknown
  retry: () => void
  pending?: boolean
}) {
  return (
    <StatePanel
      role="alert"
      icon="info"
      title="No pudimos completar la consulta"
      description={toApiError(error).message}
    >
      <button
        type="button"
        className="button-primary"
        disabled={pending}
        onClick={retry}
      >
        Reintentar
      </button>
    </StatePanel>
  )
}
