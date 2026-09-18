import { useState } from 'react'
import { Pagination } from '../../components/tables/Pagination'
import type { ImportPreview } from './contracts'

export function ImportPreviewTable({ preview }: { preview: ImportPreview }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [errorsOnly, setErrorsOnly] = useState(false)
  const invalid = preview.rows.filter((row) => row.errors.length > 0).length
  const filtered = errorsOnly
    ? preview.rows.filter((row) => row.errors.length > 0)
    : preview.rows
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)
  return (
    <section aria-label="Previsualización de importación" className="mt-6">
      <h2 className="text-lg font-semibold">Previsualización</h2>
      <p role="status" className="my-3 text-sm">
        {preview.rows.length} registros: {preview.rows.length - invalid} sin
        errores por fila y {invalid} con errores.
      </p>
      {preview.errors.length > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          <ul className="list-disc pl-5">
            {preview.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <label className="mb-3 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={errorsOnly}
          onChange={(event) => {
            setErrorsOnly(event.target.checked)
            setPage(1)
          }}
        />
        Mostrar solo filas con errores
      </label>
      <div
        role="region"
        aria-label="Vista previa; desplazamiento horizontal disponible"
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white"
      >
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Registros del archivo</caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="p-3">
                Fila
              </th>
              <th scope="col" className="min-w-64 p-3">
                Validación
              </th>
              {preview.headers.map((header, index) => (
                <th key={index} scope="col" className="p-3">
                  {header || '(sin encabezado)'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.line}>
                <th scope="row" className="p-3 align-top">
                  {row.line}
                </th>
                <td className="p-3 align-top">
                  {row.errors.length ? (
                    <ul className="list-disc pl-4 text-red-700">
                      {row.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-brand-700">Sin errores</span>
                  )}
                </td>
                {preview.headers.map((_, index) => (
                  <td
                    key={index}
                    className="max-w-64 break-words p-3 align-top"
                  >
                    {row.values[index] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="mt-3 text-sm">No hay filas para mostrar.</p>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </section>
  )
}
