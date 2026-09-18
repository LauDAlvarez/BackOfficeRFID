import { SelectField } from '../forms/SelectField'

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <nav
      aria-label="Paginación"
      className="mt-4 flex flex-wrap items-center justify-between gap-4"
    >
      <p className="text-sm text-slate-600" aria-live="polite">
        {total === 0
          ? '0 registros'
          : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total} registros`}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <SelectField
            label="Por página"
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </SelectField>
        </div>
        <button
          type="button"
          className="button-secondary"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <span className="py-3 text-sm">
          {page} / {pages}
        </span>
        <button
          type="button"
          className="button-secondary"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}
