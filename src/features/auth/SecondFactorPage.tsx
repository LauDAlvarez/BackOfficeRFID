import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField } from '../../components/forms/TextField'
import { env } from '../../lib/env'
import { ApiError } from '../../lib/api-error'
import { useAuth } from './auth-context'
import {
  recoveryCodeSchema,
  totpSchema,
  type CodeValues,
  type SecondFactorMethod,
} from './auth-schemas'
import { AuthHeading } from './AuthHeading'
import { AuthFormError } from './AuthFormError'
import { useAuthTask } from './use-auth-task'

function SecondFactorForm({
  method,
  task,
}: {
  method: SecondFactorMethod
  task: ReturnType<typeof useAuthTask>
}) {
  const { verifySecondFactor } = useAuth()
  const recovery = method === 'RECOVERY_CODE'
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<CodeValues>({
    resolver: zodResolver(recovery ? recoveryCodeSchema : totpSchema),
    defaultValues: { code: '' },
    shouldUnregister: true,
  })
  const submit = ({ code }: CodeValues) =>
    task.run(async () => {
      try {
        await verifySecondFactor(method, code)
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 422)
        )
          throw new ApiError('El código es incorrecto o ya fue utilizado.')
        throw error
      } finally {
        resetField('code')
      }
    })
  return (
    <form
      aria-label={
        recovery ? 'Código de recuperación' : 'Código de autenticación'
      }
      onSubmit={handleSubmit(submit)}
      noValidate
      className="space-y-5"
    >
      <fieldset disabled={task.pending} className="space-y-5">
        <TextField
          label={recovery ? 'Código de recuperación' : 'Código de 6 dígitos'}
          type="text"
          inputMode={recovery ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.code?.message}
          {...register('code')}
        />
        <AuthFormError message={task.error} />
        <button className="button-primary w-full" type="submit">
          {task.pending ? 'Verificando…' : 'Verificar e ingresar'}
        </button>
      </fieldset>
    </form>
  )
}

export function SecondFactorPage() {
  const task = useAuthTask()
  const [method, setMethod] = useState<SecondFactorMethod>('TOTP')
  const { cancelAuthFlow } = useAuth()
  const recovery = method === 'RECOVERY_CODE'
  return (
    <>
      <AuthHeading
        title={
          recovery ? 'Usar un código de recuperación' : 'Verificá tu identidad'
        }
        description={
          recovery
            ? 'Ingresá uno de tus códigos de un solo uso. Un código utilizado no se puede volver a usar.'
            : 'Ingresá el código TOTP de 6 dígitos de Google Authenticator, Microsoft Authenticator u otra aplicación compatible.'
        }
      />
      <SecondFactorForm key={method} method={method} task={task} />
      <button
        type="button"
        disabled={task.pending}
        onClick={() => {
          task.clearError()
          setMethod(recovery ? 'TOTP' : 'RECOVERY_CODE')
        }}
        className="mt-4 min-h-11 text-left text-sm font-semibold text-brand-700 underline underline-offset-4"
      >
        {recovery
          ? 'Usar mi aplicación de autenticación'
          : 'Usar un código de recuperación'}
      </button>
      <Link
        to="/iniciar-sesion"
        replace
        aria-disabled={task.pending}
        onClick={(event) => {
          if (task.pending) event.preventDefault()
          else cancelAuthFlow()
        }}
        className="mt-2 flex min-h-11 items-center text-sm text-slate-600 underline underline-offset-4"
      >
        Volver al inicio de sesión
      </Link>
      {env.useMocks && (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          Código de prueba:{' '}
          <code className="break-all">
            {recovery ? 'DEMO-RECUPERAR-01' : '123456'}
          </code>
          .{' '}
          {recovery
            ? 'Se consume una vez por cuenta hasta recargar la demo.'
            : 'Es un valor fijo de demostración, no un TOTP real.'}
        </p>
      )}
    </>
  )
}
