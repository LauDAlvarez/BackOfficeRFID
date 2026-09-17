import { Link } from 'react-router'
import { StatePanel } from '../components/ui/StatePanel'
import { PageHeading } from '../components/ui/PageHeading'

export function NotFoundPage() {
  return (
    <>
      <PageHeading
        eyebrow="Error 404"
        title="Página no encontrada"
        description="La dirección ingresada no corresponde a una página del backoffice."
      />
      <StatePanel
        icon="search"
        title="Volvamos al inicio"
        description="Desde el inicio podés acceder a todos los módulos disponibles."
      >
        <Link to="/" className="button-primary">
          Ir al inicio
        </Link>
      </StatePanel>
    </>
  )
}
