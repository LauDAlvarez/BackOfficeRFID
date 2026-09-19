import { z } from 'zod'

export type ImportDomain = 'alumnos' | 'profesores'
export type TransferFormat = 'csv' | 'xlsx'
export const transferMimeTypes: Record<TransferFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
export const MAX_IMPORT_ROWS = 1000
export const MAX_FILE_BYTES = 2 * 1024 * 1024
export const MAX_COLUMNS = 30
export const MAX_CELL_LENGTH = 4000
export const importColumns = {
  alumnos: [
    'nombre',
    'apellido',
    'dni',
    'legajo',
    'rfid',
    'email',
    'telefono',
    'fecha_nacimiento',
    'direccion',
    'carrera_codigo',
    'plan_codigo',
    'fecha_ingreso',
    'estado',
  ],
  profesores: [
    'nombre',
    'apellido',
    'dni',
    'legajo',
    'rfid',
    'email',
    'telefono',
    'cargo',
    'estado',
  ],
} as const
export function isImportDomain(domain: string): domain is ImportDomain {
  return domain === 'alumnos' || domain === 'profesores'
}
const rowSchema = z.object({
  line: z.number().int().min(2),
  values: z.array(z.string().max(MAX_CELL_LENGTH)).max(MAX_COLUMNS),
  errors: z.array(z.string()),
})
export const importTableSchema = z.object({
  headers: z.array(z.string()).max(MAX_COLUMNS),
  rows: z.array(rowSchema).max(MAX_IMPORT_ROWS),
})
export const importPreviewSchema = importTableSchema.extend({
  errors: z.array(z.string()),
})
export const importResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('IMPORTED'),
    imported: z.number().int().positive(),
  }),
  z.object({ status: z.literal('INVALID'), preview: importPreviewSchema }),
])
export type ImportTable = z.infer<typeof importTableSchema>
export type ImportPreview = z.infer<typeof importPreviewSchema>
export type ImportResult = z.infer<typeof importResultSchema>
export interface DownloadFile {
  blob: Blob
  filename: string
}
export function canImport(preview: ImportPreview): boolean {
  return (
    preview.rows.length > 0 &&
    preview.errors.length === 0 &&
    preview.rows.every((row) => row.errors.length === 0)
  )
}
