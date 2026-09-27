import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { getPage, pageParams, queryKeys } from '@/api/queries'
import type { EventoResponse } from '@/types/api'

/**
 * `GET /api/agenda/semanal?page=&size=` — agenda de hoy hasta el domingo.
 *
 * El backend decide la ventana con su propio reloj (`Clock.systemDefaultZone()`), así que la
 * cantidad de eventos **cambia según el día de la semana** en que se levante la app: con el seed
 * actual van de 2 (domingo) a 4 (miércoles). Los tests no pueden fijar un total, y la UI no
 * debe asumir ningún número.
 */
export function useAgendaSemanal(page: number) {
  return useQuery({
    queryKey: queryKeys.agenda(page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      getPage<EventoResponse>(`/api/agenda/semanal${pageParams(page, PAGE_SIZE)}`, signal),
    placeholderData: keepPreviousData,
  })
}
