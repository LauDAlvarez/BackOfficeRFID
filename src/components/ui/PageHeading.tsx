export function PageHeading({
  title,
  description,
  eyebrow,
}: {
  title: string
  description: string
  eyebrow?: string | undefined
}) {
  return (
    <div className="mb-7">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-3xl leading-tight text-brand-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
        {description}
      </p>
    </div>
  )
}
