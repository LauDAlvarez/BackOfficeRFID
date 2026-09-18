import { useQuery } from '@tanstack/react-query'
import { rfidService } from '../../services/rfid'

export function useRfidPerson(rfid: string) {
  return useQuery({
    queryKey: ['academic', 'rfid', rfid],
    queryFn: ({ signal }) => rfidService.findPerson(rfid, signal),
    enabled: Boolean(rfid),
  })
}
