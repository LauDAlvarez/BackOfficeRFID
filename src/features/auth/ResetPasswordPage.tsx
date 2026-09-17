import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField } from '../../components/forms/TextField'
import { env } from '../../lib/env'
import { ApiError } from '../../lib/api-error'
import { useAuth } from './auth-context'
import { resetPasswordSchema, type ResetPasswordValues } from './auth-schemas'
import { AuthHeading } from './AuthHeading'
import { AuthFormError } from './AuthFormError'
import { useAuthTask } from './use-auth-task'

export function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { resetPassword } = useAuth()
  // El token se conserva solo mientras se completa este formulario y se retira de la URL.
  const [token, setToken] = useState(
    () =>
      new URLSearchParams(location.hash.slice(1)).get('token') ??
      new URLSearchParams(location.search).get('token') ??
      '',
  )
  const [complete, setComplete] = useState(false)
  const [invalid, setInvalid] = useState(!token || token.length > 2048)
  const task = useAuthTask()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmation: '' },
    shouldUnregister: true,
  })
  useEffect(() => {
    if (location.hash || location.search)
      void navigate('/restablecer-contrasena', { replace: true })
  }, [location.hash, location.search, navigate])
  const submit = ({ password }: ResetPasswordValues) =>
    task.run(async () => {
      try {
        await resetPassword({ token, password })
        setToken('')
        setComplete(true)
      } catch (error) {
        if (
          error instanceof ApiError &&
          [400, 401, 410].includes(error.status ?? 0)
        ) {
          setToken('')
          setInvalid(true)
        }
        throw error
      } finally {
        reset()
      }
    })
  return (
    <>
      <AuthHeading
        title={complete ? 'Contraseña restablecida' : 'Restablecer contraseña'}
        description={
          complete
            ? 'Volvé a iniciar sesión para continuar.'
            : 'Usá una contraseña de entre 15 y 128 caracteres. Podés usar una frase larga.'
        }
      />
      {complete ? (
        <p role="status" className="text-sm leading-6 text-brand-700">
          {env.useMocks
            ? 'Simulación completada. Se consumió el enlace de prueba; la contraseña no fue guardada ni modificada.'
            : 'La contraseña fue actualizada. Por seguridad, las sesiones anteriores deben volver a autenticarse.'}
        </p>
      ) : invalid ? (
        <div className="space-y-4">
          <AuthFormError message="El enlace es inválido, venció o ya fue utilizado. Solicitá uno nuevo." />
          <Link to="/recuperar-contrasena" className="button-primary">
            Solicitar nuevo enlace
          </Link>
        </div>
      ) : (
        <form
          aria-label="Restablecimiento de contraseña"
          onSubmit={handleSubmit(submit)}
          noValidate
          className="space-y-5"
        >
          <fieldset disabled={task.pending} className="space-y-5">
            <TextField
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <TextField
              label="Repetir contraseña"
              type="password"
              autoComplete="new-password"
              error={errors.confirmation?.message}
              {...register('confirmation')}
            />
            <AuthFormError message={task.error} />
            <button type="submit" className="button-primary w-full">
              {task.pending ? 'Restableciendo…' : 'Restablecer contraseña'}
            </button>
          </fieldset>
        </form>
      )}
      <Link
        to="/iniciar-sesion"
        className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4"
      >
        Volver al inicio de sesión
      </Link>
    </>
  )
}
