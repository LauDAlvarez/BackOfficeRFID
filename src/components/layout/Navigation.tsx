import { NavLink } from 'react-router'
import { moduleGroups } from '../../router/modules'
import { usePermissions } from '../../features/auth/use-permissions'
import { Icon } from '../ui/Icon'

const linkClassName = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-white text-brand-900 font-semibold' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { accessibleModules } = usePermissions()
  return (
    <nav aria-label="Navegación principal" className="space-y-5 px-3 pb-6">
      <NavLink to="/" end className={linkClassName} onClick={onNavigate}>
        <Icon name="home" />
        Inicio
      </NavLink>
      {moduleGroups.map((group) => (
        <div key={group.id}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-brand-200">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {accessibleModules
              .filter((module) => module.group === group.id)
              .map((module) => (
                <li key={module.path}>
                  <NavLink
                    to={module.path}
                    className={linkClassName}
                    onClick={onNavigate}
                  >
                    <Icon name={module.icon} className="size-4 shrink-0" />
                    <span>{module.label}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
