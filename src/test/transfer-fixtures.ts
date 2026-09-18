import {
  importColumns,
  type ImportDomain,
  type ImportTable,
} from '../features/transfers/contracts'
import { encodeCsv } from '../features/transfers/csv'

export function importRow(
  domain: ImportDomain,
  changes: Record<string, string> = {},
): string[] {
  const values: Record<string, string> = {
    nombre: 'María',
    apellido: 'Prueba',
    dni: '49000001',
    legajo: 'N-001',
    rfid: 'NUEVA-001',
    email: 'maria@demo.facultad.test',
    telefono: '0351123456',
    fecha_nacimiento: '2001-02-03',
    direccion: 'Calle Prueba 10',
    carrera_codigo: 'SIS',
    plan_codigo: 'SIS-2026',
    fecha_ingreso: '2026-03-02',
    cargo: 'Profesora adjunta',
    estado: 'ACTIVO',
    ...changes,
  }
  return importColumns[domain].map((column) => values[column]!)
}
export function importTable(
  domain: ImportDomain,
  rows = [importRow(domain)],
): ImportTable {
  return {
    headers: [...importColumns[domain]],
    rows: rows.map((values, index) => ({
      line: index + 2,
      values,
      errors: [],
    })),
  }
}
export function importFile(
  domain: ImportDomain,
  rows = [importRow(domain)],
): File {
  return new File(
    [encodeCsv([[...importColumns[domain]], ...rows])],
    `${domain}.csv`,
    { type: 'text/csv' },
  )
}
export function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(blob)
  })
}
