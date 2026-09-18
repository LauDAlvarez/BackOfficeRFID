import {
  catalog,
  displayValue,
  recordLabel,
} from '../features/academic/catalog'
import {
  academicDomains,
  fieldValue,
  inputSchemaFor,
  type AcademicDomain,
  type AcademicField,
  type AcademicInput,
  type AcademicRecord,
  type InputByDomain,
} from '../features/academic/schemas'
import { relationIssues } from '../features/academic/relations'
import { ApiError } from '../lib/api-error'
import type { AcademicService } from '../services/academic-service'
import { normalizeSearch } from '../utils/text'
import { createAcademicData, type AcademicDatabase } from './academic-data'
import { createHorariosStore } from './horarios-store'
import { feeState, rfidSchema } from '../features/gestion/schemas'
import type { RfidService } from '../services/rfid-service'
import { createMockTransferService } from './transfer-service'

function checkSignal(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new DOMException('Consulta cancelada', 'AbortError')
}
function duplicateFields(domain: AcademicDomain): AcademicField[] {
  if (domain === 'alumnos' || domain === 'profesores')
    return ['dni', 'legajo', 'rfid']
  if (['carreras', 'planes-estudio', 'materias'].includes(domain))
    return ['codigo']
  return []
}
function ensureUnique(
  domain: AcademicDomain,
  input: AcademicInput,
  db: AcademicDatabase,
  id?: string,
) {
  for (const field of duplicateFields(domain)) {
    // Los identificadores de una baja lógica siguen reservados.
    const rows =
      field === 'rfid' ? [...db.alumnos, ...db.profesores] : db[domain]
    if (
      rows.some(
        (row) =>
          row.id !== id &&
          normalizeSearch(String(fieldValue(row, field))) ===
            normalizeSearch(String(fieldValue(input, field))),
      )
    ) {
      throw new ApiError(
        `Ya existe un registro con ese ${field === 'dni' ? 'DNI' : field === 'rfid' ? 'RFID' : field === 'codigo' ? 'código' : 'legajo'}.`,
        409,
      )
    }
  }
  const compound: Partial<Record<AcademicDomain, AcademicField[]>> = {
    aulas: ['numero', 'edificioId'],
    edificios: ['nombre', 'sedeId'],
    sedes: ['nombre'],
    comisiones: ['nombre'],
    'periodos-academicos': ['anio', 'cuatrimestre'],
    cursadas: ['materiaId', 'comisionId', 'periodoAcademicoId'],
    inscripciones: ['alumnoId', 'cursadaId'],
    asistencia: ['alumnoId', 'horarioCursadaId', 'fecha'],
    resultados: ['evaluacionId', 'alumnoId'],
    cuotas: ['alumnoId', 'anio', 'mes'],
  }
  const fields = compound[domain]
  if (
    fields &&
    db[domain].some(
      (row) =>
        row.id !== id &&
        fields.every(
          (field) =>
            normalizeSearch(String(fieldValue(row, field))) ===
            normalizeSearch(String(fieldValue(input, field))),
        ),
    )
  ) {
    throw new ApiError(
      domain === 'inscripciones'
        ? 'El alumno ya tiene una inscripción en esta cursada, incluso si está inactiva o dada de baja.'
        : 'Ya existe un registro con esa combinación de datos.',
      409,
    )
  }
}

export function createMockAcademicDatabase(
  initial: AcademicDatabase = createAcademicData(),
) {
  const db = structuredClone(initial)
  const horariosStore = createHorariosStore(db.cursadas)
  function refreshFees() {
    db.cuotas.forEach((row) => {
      row.estado = feeState(row)
    })
  }
  function service<D extends AcademicDomain>(domain: D): AcademicService<D> {
    const rows = db[domain] as AcademicRecord<D>[]
    function find(id: string) {
      const record = rows.find((item) => item.id === id && !item.deletedAt)
      if (!record)
        throw new ApiError(
          'El registro no está disponible o fue dado de baja.',
          404,
        )
      return record
    }
    function validate(input: InputByDomain[D], id?: string) {
      const result = inputSchemaFor(domain).safeParse(input)
      if (!result.success)
        throw new ApiError(
          result.error.issues[0]?.message ?? 'Revisá los datos ingresados.',
          422,
        )
      ensureUnique(domain, result.data, db, id)
      if ('horarios' in result.data)
        horariosStore.validateOwnership(result.data.horarios, id)
      const issues = relationIssues(domain, result.data, db, id)
      if (issues.length) throw new ApiError(issues[0]!.message, 422)
      return result.data
    }
    return {
      async list(params, signal) {
        checkSignal(signal)
        refreshFees()
        const search = normalizeSearch(params.search)
        const fields = catalog[domain].fields
        const filtered = rows.filter(
          (row) =>
            !row.deletedAt &&
            (!params.estado || row.estado === params.estado) &&
            Object.entries(params.filters).every(([key, value]) => {
              if (!value) return true
              const current = fieldValue(row, key as AcademicField)
              return Array.isArray(current)
                ? current.includes(value)
                : String(current) === value
            }) &&
            (!search ||
              normalizeSearch(
                fields.map((field) => displayValue(field, row, db)).join(' '),
              ).includes(search)),
        )
        const sortField =
          fields.find((field) => field.name === params.sortBy) ?? fields[0]!
        filtered.sort(
          (a, b) =>
            (displayValue(sortField, a, db).localeCompare(
              displayValue(sortField, b, db),
              'es-AR',
              { numeric: true, sensitivity: 'base' },
            ) || a.id.localeCompare(b.id)) *
            (params.sortOrder === 'asc' ? 1 : -1),
        )
        // ISO dates sort chronologically, unlike the DD/MM/YYYY presentation.
        if (sortField.type === 'date')
          filtered.sort(
            (a, b) =>
              String(fieldValue(a, sortField.name)).localeCompare(
                String(fieldValue(b, sortField.name)),
              ) * (params.sortOrder === 'asc' ? 1 : -1),
          )
        if (sortField.type === 'number')
          filtered.sort(
            (a, b) =>
              (Number(fieldValue(a, sortField.name)) -
                Number(fieldValue(b, sortField.name))) *
              (params.sortOrder === 'asc' ? 1 : -1),
          )
        const pageSize = Math.min(100, Math.max(1, params.pageSize))
        const page = Math.min(
          Math.max(1, params.page),
          Math.max(1, Math.ceil(filtered.length / pageSize)),
        )
        return structuredClone({
          data: filtered.slice((page - 1) * pageSize, page * pageSize),
          total: filtered.length,
          page,
          pageSize,
        })
      },
      async get(id, signal) {
        checkSignal(signal)
        refreshFees()
        return structuredClone(find(id))
      },
      async create(input) {
        if ('origen' in input && input.origen !== 'MANUAL')
          throw new ApiError(
            'El backoffice solo permite registrar asistencia manual.',
            422,
          )
        const data = validate(input)
        const now = new Date().toISOString()
        const record: AcademicRecord<D> = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }
        rows.push(record)
        if ('horarios' in record) horariosStore.save(record)
        return structuredClone(record)
      },
      async update(id, input) {
        const current = find(id)
        if (
          'origen' in current &&
          'origen' in input &&
          input.origen !== current.origen
        )
          throw new ApiError(
            'Una corrección conserva el origen del registro.',
            422,
          )
        const data = validate(input, id)
        const updated = {
          ...data,
          id,
          createdAt: current.createdAt,
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        }
        // Cambiar la sede de un edificio o la carrera de un plan no puede romper vínculos existentes.
        const candidate = {
          ...db,
          [domain]: rows.map((row) => (row.id === id ? updated : row)),
        }
        for (const relatedDomain of academicDomains) {
          for (const row of candidate[relatedDomain]) {
            const issues = !row.deletedAt
              ? relationIssues(relatedDomain, row, candidate, row.id)
              : []
            if (issues.length) {
              throw new ApiError(
                `El cambio dejaría relaciones incompatibles en ${recordLabel(row, candidate)}. ${issues[0]!.message}`,
                409,
              )
            }
          }
        }
        rows[rows.indexOf(current)] = updated
        if ('horarios' in updated) horariosStore.save(updated)
        return structuredClone(updated)
      },
      async softDelete(id) {
        const current = find(id)
        if (
          domain === 'inscripciones' &&
          'condicionAcademica' in current &&
          (db.asistencia.some(
            (row) =>
              !row.deletedAt &&
              row.alumnoId === current.alumnoId &&
              row.cursadaId === current.cursadaId,
          ) ||
            db.resultados.some(
              (row) =>
                !row.deletedAt &&
                row.alumnoId === current.alumnoId &&
                db.evaluaciones.some(
                  (evaluation) =>
                    evaluation.id === row.evaluacionId &&
                    evaluation.cursadaId === current.cursadaId,
                ),
            ))
        )
          throw new ApiError(
            'La inscripción tiene asistencias o resultados vinculados. Podés inactivarla para conservar el historial.',
            409,
          )
        if (
          domain === 'aulas' &&
          db.cursadas.some(
            (course) =>
              !course.deletedAt &&
              course.horarios.some((horario) => horario.aulaId === id),
          )
        ) {
          throw new ApiError(
            'No se puede dar de baja el aula: tiene horarios de cursadas vinculados.',
            409,
          )
        }
        for (const relatedDomain of academicDomains) {
          const references = catalog[relatedDomain].fields.filter(
            (field) => field.relation === domain,
          )
          if (
            db[relatedDomain].some(
              (row) =>
                !row.deletedAt &&
                (relatedDomain !== domain || row.id !== id) &&
                references.some((field) => {
                  const value = fieldValue(row, field.name)
                  return Array.isArray(value)
                    ? value.includes(id)
                    : value === id
                }),
            )
          )
            throw new ApiError(
              'No se puede dar de baja: hay registros vinculados. Reasignalos o dalos de baja primero.',
              409,
            )
        }
        current.deletedAt = new Date().toISOString()
        current.updatedAt = current.deletedAt
        if ('horarios' in current) horariosStore.save(current)
      },
    }
  }
  const rfid: RfidService = {
    async findPerson(value, signal) {
      checkSignal(signal)
      const parsed = rfidSchema.safeParse(value)
      if (!parsed.success) throw new ApiError('Ingresá un RFID válido.', 422)
      const alumno = db.alumnos.find(
        (row) => !row.deletedAt && row.rfid.toUpperCase() === parsed.data,
      )
      if (alumno) return structuredClone({ tipo: 'ALUMNO', persona: alumno })
      const profesor = db.profesores.find(
        (row) => !row.deletedAt && row.rfid.toUpperCase() === parsed.data,
      )
      return profesor
        ? structuredClone({ tipo: 'PROFESOR', persona: profesor })
        : null
    },
  }
  return { service, rfid, transfers: createMockTransferService(db, service) }
}
const database = createMockAcademicDatabase()
export const mockAcademicService = database.service
export const mockRfidService = database.rfid
export const mockTransferService = database.transfers
