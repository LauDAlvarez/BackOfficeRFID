export function AuthFormError({ message }: { message: string | null }) {
  return message ? (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
    >
      {message}
    </p>
  ) : null
}
