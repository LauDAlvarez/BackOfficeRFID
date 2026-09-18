import { useId, type ComponentProps } from 'react'

export function SelectField({
  label,
  error,
  id,
  children,
  ...props
}: ComponentProps<'select'> & { label: string; error?: string | undefined }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="min-w-0 flex-1">
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <select
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`min-h-11 w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800 ${error ? 'border-red-600' : 'border-slate-300'}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  )
}
