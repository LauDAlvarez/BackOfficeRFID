import { Link } from 'react-router'
import { PageHeading } from '../../components/ui/PageHeading'
import { StatePanel } from '../../components/ui/StatePanel'
import { toApiError } from '../../lib/api-error'
import { useSedes } from './use-sedes'

export function SedesPage() {
  const query = useSedes()
  return (
    <>
      <PageHeading
        eyebrow="Espacios"
        title="Sedes"
        description="Ubicaciones de la institución."
      />
      {query.isPending ? (
        <StatePanel
          role="status"
          icon="building"
          title="Cargando sedes…"
          description="Estamos consultando la información disponible."
        />
      ) : query.isError ? (
        <StatePanel
          role="alert"
          icon="info"
          title="No pudimos cargar las sedes"
          description={toApiError(query.error).message}
        >
          <button
            type="button"
            className="button-primary"
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch()
            }}
          >
            {query.isFetching ? 'Reintentando…' : 'Reintentar'}
          </button>
        </StatePanel>
      ) : (
        <StatePanel
          icon="building"
          title={
            query.data.length === 0
              ? 'Todavía no hay sedes para mostrar'
              : 'Este módulo está en preparación'
          }
          description="La consulta y gestión de sedes se habilitará en una próxima etapa."
        >
          <Link to="/" className="button-secondary">
            Volver a los módulos
          </Link>
        </StatePanel>
      )}
    </>
  )
}
