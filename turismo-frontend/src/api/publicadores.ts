import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { getPage, pageParams, queryKeys } from '@/api/queries'
import { apiGet, apiPost } from '@/lib/http'
import type {
  PropuestaResumenResponse,
  PublicadorRequest,
  PublicadorResponse,
} from '@/types/api'

/**
 * Tope de página que acepta el backend (`spring.data.web.pageable.max-page-size=100`).
 *
 * El formulario de evento necesita todos los publicadores en un solo `<Select>` y la API no tiene
 * un endpoint de opciones ni de búsqueda: solo el listado paginado. Pedir una sola página con el
 * máximo es lo más cerca que se puede estar. El límite real es que con más de 100 publicadores
 * cargados el selector quedaría incompleto; cuando eso importe, la solución es un
 * `GET /api/publicadores/options` con id y nombre, no agrandar este número.
 */
export const PUBLICADORES_MAX_SIZE = 100

/** `GET /api/publicadores?page=&size=` — listado completo en orden alfabético. */
export function usePublicadores(page: number, size: number = PAGE_SIZE) {
  return useQuery({
    queryKey: queryKeys.publicadores(page, size),
    queryFn: ({ signal }) =>
      getPage<PublicadorResponse>(`/api/publicadores${pageParams(page, size)}`, signal),
    placeholderData: keepPreviousData,
  })
}

/** `GET /api/publicadores/{id}` — detalle. Misma validación de id que `useEvento`. */
export function usePublicador(id: number | null) {
  return useQuery({
    queryKey: queryKeys.publicador(id ?? 0),
    queryFn: ({ signal }) => apiGet<PublicadorResponse>(`/api/publicadores/${id}`, signal),
    enabled: id !== null,
  })
}

/**
 * `GET /api/propuestas?publicadorId=&page=&size=` — propuestas turísticas (eventos y actividades) de un publicador.
 */
export function useEventosDePublicador(id: number | null, page: number) {
  return useQuery({
    queryKey: queryKeys.publicadorEventos(id ?? 0, page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      getPage<PropuestaResumenResponse>(
        `/api/propuestas${pageParams(page, PAGE_SIZE)}&publicadorId=${id}`,
        signal,
      ),
    placeholderData: keepPreviousData,
    enabled: id !== null,
  })
}

/**
 * `POST /api/publicadores` — alta de publicador.
 *
 * El `email` es único en el backend. El caso normal lo corta `PublicadorService` con un
 * `BusinessRuleException` → 400 con `"ya existe un publicador con ese email"`, que la página
 * muestra como error del formulario.
 */
export function useCrearPublicador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: PublicadorRequest) =>
      apiPost<PublicadorResponse, PublicadorRequest>('/api/publicadores', request),
    onSuccess: () => {
      // El listado está paginado y ordenado alfabéticamente por nombre, así que un alta puede
      // caer en cualquier página: se invalida el prefijo entero y no una página en particular.
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicadoresAll() })
    },
  })
}
