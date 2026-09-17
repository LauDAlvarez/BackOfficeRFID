import { useEffect, useRef } from 'react'

export function AuthHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [title])
  return (
    <div className="mb-6">
      <h1
        ref={heading}
        tabIndex={-1}
        className="font-serif text-3xl text-brand-900 outline-none"
      >
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}
