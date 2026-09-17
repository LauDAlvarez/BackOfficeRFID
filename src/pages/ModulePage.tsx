import { Link } from 'react-router'
import { PageHeading } from '../components/ui/PageHeading'
import { StatePanel } from '../components/ui/StatePanel'
import { moduleGroups, type AppModule } from '../router/modules'
import { usePermissions } from '../features/auth/use-permissions'

export function ModulePage({ module }: { module: AppModule }) {
  const { can } = usePermissions()
  return (
    <>
      <PageHeading
        eyebrow={moduleGroups.find((group) => group.id === module.group)?.label}
        title={module.label}
        description={module.description}
      />
      <StatePanel
        icon={module.icon}
        title="Este módulo está en preparación"
        description="Este será el espacio de consulta y gestión del módulo. Sus funciones estarán disponibles en una próxima etapa."
      >
        <Link to="/" className="button-secondary">
          Volver a los módulos
        </Link>
      </StatePanel>
      <p className="mt-4 text-sm text-slate-500">
        {can('create')
          ? 'Tu perfil cuenta con permisos de administración.'
          : 'Tu perfil permite consultar y exportar. No permite modificar datos.'}
      </p>
    </>
  )
}
