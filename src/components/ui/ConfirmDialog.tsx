import { useEffect, useId, useRef } from 'react'

export function ConfirmDialog({
  open,
  title,
  description,
  error,
  pending,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirmar baja lógica',
  pendingLabel = 'Dando de baja…',
  destructive = true,
}: {
  open: boolean
  title: string
  description: string
  error?: string | undefined
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
  pendingLabel?: string
  destructive?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal()
    else if (!open && ref.current?.open) ref.current.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onCancel()
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
    >
      <h2 id={titleId} className="text-xl font-semibold text-slate-900">
        {title}
      </h2>
      <p
        id={descriptionId}
        className="mt-3 break-words text-sm leading-6 text-slate-600"
      >
        {description}
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="button-secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`button-primary ${destructive ? 'bg-red-700 hover:bg-red-800' : ''}`}
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
