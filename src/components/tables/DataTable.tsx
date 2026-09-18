import type { ReactNode } from 'react'

export interface TableColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
}
export function DataTable<T extends { id: string }>({
  caption,
  columns,
  rows,
  sortBy,
  sortOrder,
  onSort,
  actions,
}: {
  caption: string
  columns: TableColumn<T>[]
  rows: T[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (key: string) => void
  actions: (row: T) => ReactNode
}) {
  return (
    <div
      role="region"
      aria-label={`Tabla de ${caption.toLocaleLowerCase('es-AR')}; desplazamiento horizontal disponible`}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-slate-200 bg-white"
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  sortBy === column.key
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className="px-4 py-2 font-semibold"
              >
                <button
                  type="button"
                  className="min-h-11 text-left"
                  onClick={() => onSort(column.key)}
                  aria-label={`Ordenar por ${column.label.toLocaleLowerCase('es-AR')}`}
                >
                  {column.label}{' '}
                  <span aria-hidden="true">
                    {sortBy === column.key
                      ? sortOrder === 'asc'
                        ? '↑'
                        : '↓'
                      : '↕'}
                  </span>
                </button>
              </th>
            ))}
            <th scope="col" className="px-4 py-3">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column.key} className="max-w-72 break-words px-4 py-4">
                  {column.render(row)}
                </td>
              ))}
              <td className="px-4 py-2">{actions(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
