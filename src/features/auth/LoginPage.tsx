import { Link, Navigate, useLocation } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField } from '../../components/forms/TextField'
import { env } from '../../lib/env'
import { ApiError } from '../../lib/api-error'
import { useAuth } from './auth-context'
import { loginSchema, type LoginInput } from './auth-schemas'
import { AuthHeading } from './AuthHeading'
import { AuthFormError } from './AuthFormError'
import { useAuthTask } from './use-auth-task'

export function LoginPage() {
  const { login, state, challenge, cancelAuthFlow, logout } = useAuth()
  const location = useLocation()
  const task = useAuthTask()
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    shouldUnregister: true,
  })
  if (challenge)
    return <Navigate to="/verificar-identidad" replace state={location.state} />
  const reason = state.status === 'anonymous' ? state.reason : null
  const submit = (input: LoginInput) =>
    task.run(async () => {
      try {
        await login(input)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401)
          throw new ApiError('Email o contraseña incorrectos.')
        throw error
      } finally {
        resetField('password')
      }
    })

  return (
    <>
      <AuthHeading
        title="Iniciar sesión"
        description="Ingresá con tu cuenta de administración o secretaría."
      />
      {reason === 'expired' && (
        <p role="status" className="mb-5 text-sm text-amber-800">
          Tu sesión venció. Volvé a ingresar para continuar.
        </p>
      )}
      {reason === 'challenge-expired' && (
        <p role="alert" className="mb-5 text-sm text-amber-800">
          La verificación venció o se agotaron los intentos. Volvé a iniciar
          sesión.
        </p>
      )}
      {reason === 'logout' && (
        <p role="status" className="mb-5 text-sm text-brand-700">
          Cerraste la sesión.
        </p>
      )}
      {reason === 'logout-failed' && (
        <div className="mb-5 space-y-3">
          <AuthFormError message="Se cerró el acceso en esta pantalla, pero no pudimos confirmar el cierre en el servidor. Reintentá antes de dejar este equipo." />
          <button
            type="button"
            onClick={() => {
              void logout()
            }}
            className="button-secondary"
          >
            Reintentar cierre de sesión
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-5"
        aria-label="Inicio de sesión"
      >
        <fieldset disabled={task.pending} className="space-y-5">
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <AuthFormError message={task.error} />
          <button className="button-primary w-full" type="submit">
            {task.pending ? 'Ingresando…' : 'Continuar'}
          </button>
        </fieldset>
      </form>
      <Link
        to="/recuperar-contrasena"
        aria-disabled={task.pending}
        onClick={(event) => {
          if (task.pending) event.preventDefault()
          else cancelAuthFlow()
        }}
        className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4"
      >
        Olvidé mi contraseña
      </Link>
      {env.useMocks && (
        <details className="mt-5 border-t border-slate-200 pt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-brand-700">
            Cuentas de demostración
          </summary>
          <div className="mt-3 space-y-2 break-words text-slate-600">
            <p>
              Administrador: <code>admin@demo.facultad.test</code>
            </p>
            <p>
              Secretaría: <code>secretaria@demo.facultad.test</code>
            </p>
            <p>
              Escribí cualquier contraseña ficticia no vacía. La demo no la
              valida ni la guarda.
            </p>
          </div>
        </details>
      )}
    </>
  )
}
