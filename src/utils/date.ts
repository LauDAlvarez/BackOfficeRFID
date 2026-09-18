export const APP_TIME_ZONE = 'America/Argentina/Cordoba'

export function todayInCordoba(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: APP_TIME_ZONE })
}

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatDate(value: string | Date): string {
  // Una fecha sin hora representa un día de calendario, no medianoche UTC.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`)
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      return '—'
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}
