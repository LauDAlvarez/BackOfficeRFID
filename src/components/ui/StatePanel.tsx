import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function StatePanel({
  title,
  description,
  icon = 'folder',
  children,
  role,
}: {
  title: string
  description: string
  icon?: IconName
  children?: ReactNode
  role?: 'status' | 'alert'
}) {
  return (
    <section
      role={role}
      className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center sm:py-20"
    >
      <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="size-7" />
      </span>
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
