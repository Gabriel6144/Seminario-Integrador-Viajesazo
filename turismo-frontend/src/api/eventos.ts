import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { getPage, pageParams, queryKeys } from '@/api/queries'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/http'
import type { EventoRequest, EventoResponse } from '@/types/api'

export const PAGE_SIZE = 12

/**
 * Hooks de eventos.
 *
 * Todos devuelven la `Page` completa (con `page.*`) y no solo `content`: los controles de
 * paginación necesitan `totalElements` y `totalPages`. Desenvolver el envelope en el hook y
 * dejar que la vista adivine los metadatos repartiría el conocimiento del formato en toda la app.
 *
 * `keepPreviousData` evita que al cambiar de página la grilla se vacíe y parpadee: se mantiene la
 * página anterior visible mientras llega la nueva.
 */

/** `GET /api/eventos?page=&size=` — listado completo, sin ventana de fechas. */
export function useEventos(page: number) {
  return useQuery({
    queryKey: queryKeys.eventos(page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      getPage<EventoResponse>(`/api/eventos${pageParams(page, PAGE_SIZE)}`, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * `GET /api/eventos/{id}` — detalle.
 *
 * `id` es `null` mientras el parámetro de la ruta no sea un entero válido. En ese caso la query
 * queda deshabilitada y no se dispara nada: el backend no tiene `@Validated` en los controllers,
 * así que un id como `abc` cae en el catch-all y devuelve **500** en lugar de 400. Validar en el
 * cliente evita el request inútil y el error engañoso.
 */
export function useEvento(id: number | null) {
  return useQuery({
    queryKey: queryKeys.evento(id ?? 0),
    queryFn: ({ signal }) => apiGet<EventoResponse>(`/api/eventos/${id}`, signal),
    enabled: id !== null,
  })
}

/**
 * Invalida todo lo que puede mostrar un evento.
 *
 * Son tres listados y el detalle, porque un evento aparece en los tres: el listado completo, la
 * agenda de la semana (que además depende de la fecha, así que un evento que entra o sale de la
 * ventana cambia aunque no se haya tocado la fecha) y la grilla del publicador. Dejarlos fuera
 * alguna de las mutaciones es la forma más fácil de tener la UI mostrando algo que el backend ya
 * no tiene.
 */
function invalidateEventoViews(queryClient: QueryClient, publicadorId: number): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.eventosAll() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.agendaAll() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.publicadorEventosAll(publicadorId) })
}

/** `POST /api/eventos` — alta de evento. US1. */
export function useCrearEvento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: EventoRequest) =>
      apiPost<EventoResponse, EventoRequest>('/api/eventos', request),
    onSuccess: (evento) => {
      invalidateEventoViews(queryClient, evento.publicadorId)
      // El id es nuevo, así que no hay caché previa que ajustar: alcanza con invalidar.
    },
  })
}

/**
 * `PUT /api/eventos/{id}` — modificación. US2.
 *
 * `previousPublicadorId` va explícito en las variables y no se deduce de la caché: si el evento
 * cambió de publicador, la grilla del publicador **anterior** también quedó desactualizada, y a
/** `PUT /api/eventos/{id}` — modificación. US2.
 *
 * `previousPublicadorId` va explícito en las variables y no se deduce de la caché: si el evento
 * cambió de publicador, la grilla del publicador **anterior** también quedó desactualizada, y a
 * esa hay que invalidarla además de la del nuevo.
 */
interface ActualizarEventoVariables {
  id: number
  request: EventoRequest
  previousPublicadorId: number
}

/** El `publicadorId` lo manda quien borra porque la baja no devuelve nada (204). */
interface BorrarEventoVariables {
  id: number
  publicadorId: number
}

export function useActualizarEvento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: ActualizarEventoVariables) =>
      apiPut<EventoResponse, EventoRequest>(`/api/eventos/${id}`, request),
    onSuccess: (evento, { id, previousPublicadorId }) => {
      invalidateEventoViews(queryClient, evento.publicadorId)
      if (previousPublicadorId !== evento.publicadorId) {
        invalidateEventoViews(queryClient, previousPublicadorId)
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.evento(id) })
    },
  })
}

/**
 * `DELETE /api/eventos/{id}` — baja física. US3.
 *
 * El backend responde 204 sin cuerpo, así que la mutación no devuelve nada: el éxito se
 * expresa en que no hubo excepción.
 */
export function useBorrarEvento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: BorrarEventoVariables) => apiDelete(`/api/eventos/${id}`),
    onSuccess: (_data, { id, publicadorId }) => {
      invalidateEventoViews(queryClient, publicadorId)
      // Y no solo invalidar el detalle: sacarlo de la caché. Si quedara marcado como viejo,
      // el botón "atrás" del navegador lo volvería a pedir, recibiría 404 y el usuario vería
      // "no existe el evento" después de haberlo borrado él mismo.
      queryClient.removeQueries({ queryKey: queryKeys.evento(id) })
    },
  })
}
