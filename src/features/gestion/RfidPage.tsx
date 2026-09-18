import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { PageHeading } from '../../components/ui/PageHeading'
import { TextField } from '../../components/forms/TextField'
import {
  AcademicError,
  AcademicLoading,
  AcademicNotice,
} from '../academic/AcademicFeedback'
import { Can } from '../auth/Can'
import { rfidSearchSchema } from './schemas'
import { useRfidPerson } from './use-rfid'

export function RfidPage() {
  const [rfid, setRfid] = useState('')
  const query = useRfidPerson(rfid)
  const form = useForm<{ rfid: string }>({
    resolver: zodResolver(rfidSearchSchema),
    defaultValues: { rfid: '' },
  })
  const match = query.data
  const domain = match?.tipo === 'ALUMNO' ? 'alumnos' : 'profesores'
  return (
    <>
      <PageHeading
        title="RFID"
        description="Consulta de tarjetas y asociación con alumnos y profesores."
      />
      <AcademicNotice />
      <form
        noValidate
        className="mb-6 flex max-w-2xl flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5"
        onSubmit={form.handleSubmit(({ rfid: value }) => {
          if (value === rfid) void query.refetch()
          else setRfid(value)
        })}
      >
        <div className="min-w-0 flex-1">
          <TextField
            label="RFID"
            {...form.register('rfid')}
            error={form.formState.errors.rfid?.message}
          />
        </div>
        <button
          type="submit"
          className="button-primary"
          disabled={query.isFetching}
        >
          Consultar RFID
        </button>
      </form>
      {rfid &&
        (query.isPending ? (
          <AcademicLoading />
        ) : query.error ? (
          <AcademicError
            error={query.error}
            pending={query.isFetching}
            retry={() => {
              void query.refetch()
            }}
          />
        ) : match ? (
          <section
            className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5"
            aria-label="Persona asociada"
          >
            <h2 className="text-lg font-semibold">
              {match.persona.apellido}, {match.persona.nombre}
            </h2>
            <p className="mt-2 text-sm">
              {match.tipo === 'ALUMNO' ? 'Alumno' : 'Profesor'} · Legajo{' '}
              {match.persona.legajo} ·{' '}
              {match.persona.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
            </p>
            <p className="mt-2 break-all text-sm">
              RFID: {match.persona.rfid}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="button-secondary"
                to={`/${domain}/${match.persona.id}`}
              >
                Ver persona
              </Link>
              <Can permission="update">
                <Link
                  className="button-primary"
                  to={`/${domain}/${match.persona.id}/editar`}
                >
                  Modificar asociación RFID
                </Link>
              </Can>
            </div>
          </section>
        ) : (
          <p role="status">No hay una persona asociada a ese RFID.</p>
        ))}
      <p className="mt-6 text-sm text-slate-600">
        Las asociaciones se administran desde las fichas de{' '}
        <Link className="underline" to="/alumnos">
          alumnos
        </Link>{' '}
        y{' '}
        <Link className="underline" to="/profesores">
          profesores
        </Link>
        . Cada RFID identifica a una sola persona.
      </p>
    </>
  )
}
