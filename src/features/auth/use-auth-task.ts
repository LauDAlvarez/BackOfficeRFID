import { useRef, useState } from 'react'
import { toApiError } from '../../lib/api-error'

// Las credenciales no pasan por el caché de mutaciones de TanStack Query.
export function useAuthTask() {
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (task: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      await task()
    } catch (cause) {
      setError(toApiError(cause).message)
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return { pending, error, run, clearError: () => setError(null) }
}
