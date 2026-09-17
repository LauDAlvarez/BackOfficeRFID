import { useQuery } from '@tanstack/react-query'
import { sedesService } from '../../services'

export function useSedes() {
  return useQuery({
    queryKey: ['sedes'],
    queryFn: ({ signal }) => sedesService.list(signal),
  })
}
