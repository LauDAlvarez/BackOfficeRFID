import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField } from '../../components/forms/TextField'
import { env } from '../../lib/env'
import { useAuth } from './auth-context'
import { forgotPasswordSchema, type ForgotPasswordInput } from './auth-schemas'
import { AuthHeading } from './AuthHeading'
import { AuthFormError } from './AuthFormError'
import { useAuthTask } from './use-auth-task'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [result, setResult] = useState<{ demoToken?: string } | null>(null)
  const task = useAuthTask()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })
  return (
    <>
      <AuthHeading
        title="Recuperar contraseña"
        description="Ingresá el email asociado a tu cuenta administrativa."
      />
      {result ? (
        <div className="space-y-4">
          <p role="status" className="text-sm leading-6 text-slate-700">
            Si existe una cuenta habilitada para ese email, recibirás un enlace
            temporal para restablecer tu contraseña.
          </p>
          {env.useMocks && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p>Simulación: no se envió ningún email.</p>
              {result.demoToken && (
                <Link
                  to={`/restablecer-contrasena#token=${encodeURIComponent(result.demoToken)}`}
                  className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                >
                  Abrir enlace de demostración
                </Link>
              )}
            </div>
          )}
          <button className="button-secondary" onClick={() => setResult(null)}>
            Solicitar otro enlace
          </button>
        </div>
      ) : (
        <form
          aria-label="Recuperación de contraseña"
          onSubmit={handleSubmit((input) =>
            task.run(async () => {
              setResult(await requestPasswordReset(input))
            }),
          )}
          noValidate
          className="space-y-5"
        >
          <fieldset disabled={task.pending} className="space-y-5">
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              error={errors.email?.message}
              {...register('email')}
            />
            <AuthFormError message={task.error} />
            <button type="submit" className="button-primary w-full">
              {task.pending ? 'Enviando solicitud…' : 'Solicitar enlace'}
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
