import { Icon } from '../ui/Icon'

export function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6 text-white">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/25 bg-white/5">
        <Icon name="institution" className="size-7" />
      </span>
      <div>
        <p className="font-serif text-xl tracking-wide">Facultad</p>
        <p className="mt-0.5 text-xs tracking-widest text-brand-200">
          GESTIÓN ACADÉMICA
        </p>
      </div>
    </div>
  )
}
