import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiGet } from '@/lib/http'
import type { PropuestaInscriptosResponse } from '@/types/api'

export function usePublicadorInscriptos(enabled = true) {
  return useQuery({
    queryKey: queryKeys.publicadorInscriptos(),
    queryFn: ({ signal }) =>
      apiGet<PropuestaInscriptosResponse[]>('/api/publicador/inscriptos', signal),
    enabled,
  })
}
