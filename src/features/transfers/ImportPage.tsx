import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeading } from '../../components/ui/PageHeading'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { AcademicNotice } from '../academic/AcademicFeedback'
import { toApiError } from '../../lib/api-error'
import {
  canImport,
  importColumns,
  MAX_IMPORT_ROWS,
  type ImportDomain,
} from './contracts'
import { ImportPreviewTable } from './ImportPreviewTable'
import { useImport } from './use-transfers'

export function ImportPage({ domain }: { domain: ImportDomain }) {
  const task = useImport(domain)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [filename, setFilename] = useState('')
  const busy =
    task.preview.isPending || task.commit.isPending || task.template.isPending
  const imported =
    task.commit.data?.status === 'IMPORTED' ? task.commit.data.imported : 0
  const preview =
    task.commit.data?.status === 'INVALID'
      ? task.commit.data.preview
      : task.preview.data?.preview
  const error = task.preview.error ?? task.commit.error ?? task.template.error
  return (
    <>
      <Link
        className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline"
        to={`/${domain}`}
      >
        Volver a {domain}
      </Link>
      <PageHeading
        title={`Importar ${domain}`}
        description="Seleccioná un archivo, revisá cada fila y confirmá el lote completo."
      />
      <AcademicNotice />
      <section
        aria-label="Formato esperado"
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-lg font-semibold">1. Preparar el archivo</h2>
        <p className="mt-3 text-sm text-slate-600">
          CSV UTF-8 (coma o punto y coma) o XLSX con una sola hoja. Máximo 2
          MB y {MAX_IMPORT_ROWS} registros. Identificadores como texto para
          conservar ceros iniciales; fechas YYYY-MM-DD; estado ACTIVO o
          INACTIVO. No se admiten fórmulas.
        </p>
        {domain === 'alumnos' && (
          <p className="mt-2 text-sm text-slate-600">
            Usá los códigos de las carreras y planes existentes. El plan debe
            pertenecer a la carrera indicada.
          </p>
        )}
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold">
            Ver columnas requeridas
          </summary>
          <ul className="mt-3 grid list-inside list-disc gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {importColumns[domain].map((column) => (
              <li key={column}>{column}</li>
            ))}
          </ul>
        </details>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => task.template.mutate('csv')}
          >
            Descargar plantilla CSV
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => task.template.mutate('xlsx')}
          >
            Descargar plantilla XLSX
          </button>
        </div>
      </section>
      <section
        aria-label="Seleccionar archivo"
        className="mt-5 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-4 text-lg font-semibold">
          2. Validar y previsualizar
        </h2>
        <label
          htmlFor="import-file"
          className="mb-2 block text-sm font-medium"
        >
          Archivo CSV o XLSX
        </label>
        <input
          id="import-file"
          type="file"
          accept=".csv,.xlsx"
          disabled={busy}
          className="block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:px-3 file:py-2"
          onChange={(event) => {
            const file = event.target.files?.[0]
            task.preview.reset()
            task.commit.reset()
            task.template.reset()
            setConfirmOpen(false)
            setFilename(file?.name ?? '')
            if (file) task.preview.mutate(file)
            event.target.value = ''
          }}
        />
        {filename && (
          <p className="mt-3 break-all text-sm">
            Archivo seleccionado: {filename}
          </p>
        )}
        {task.preview.isPending && (
          <p role="status" className="mt-3 text-sm">
            Leyendo y validando el archivo…
          </p>
        )}
        {task.template.isPending && (
          <p role="status" className="mt-3 text-sm">
            Preparando plantilla…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {toApiError(error).message}
          </p>
        )}
        {task.commit.data?.status === 'INVALID' && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            El lote tiene errores. No se importó ningún registro; revisá la
            previsualización actualizada.
          </p>
        )}
        {imported > 0 && (
          <p
            role="status"
            className="mt-3 text-sm font-semibold text-brand-700"
          >
            Se importaron {imported} registros. Podés consultarlos en el
            listado de {domain}.
          </p>
        )}
      </section>
      {preview && !imported && (
        <>
          <ImportPreviewTable
            key={
              filename +
              JSON.stringify(preview.errors) +
              (task.commit.data?.status ?? '')
            }
            preview={preview}
          />
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="button-primary"
              disabled={busy || !canImport(preview)}
              onClick={() => setConfirmOpen(true)}
            >
              Importar {preview.rows.length} registros
            </button>
            <p className="text-sm text-slate-600">
              Corregí todos los errores en el archivo y volvé a seleccionarlo.
              No se modifican registros existentes.
            </p>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar importación"
        description={`Se crearán ${preview?.rows.length ?? 0} ${domain}. Se volverá a validar el lote completo antes de guardarlo.`}
        pending={task.commit.isPending}
        destructive={false}
        confirmLabel="Confirmar importación"
        pendingLabel="Importando…"
        error={
          task.commit.error
            ? toApiError(task.commit.error).message
            : undefined
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (!task.preview.data || !preview || !canImport(preview)) return
          void task.commit
            .mutateAsync(task.preview.data.table)
            .then(() => setConfirmOpen(false))
            .catch(() => {
              /* Error visible en el diálogo. */
            })
        }}
      />
    </>
  )
}
