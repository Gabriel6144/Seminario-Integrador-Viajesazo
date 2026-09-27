import { apiGet } from '@/lib/http'
import type { Page } from '@/types/api'

/**
 * Claves de caché de TanStack Query, centralizadas.
 *
 * Centralizarlas evita dos errores frecuentes: que dos componentes pidan lo mismo con claves
 * distintas (se duplica el request y se rompe la invalidación) y que al invalidar una haya que
 * acordarse de la forma exacta del array.
 *
 * Cada recurso tiene dos claves: la exacta de una consulta con sus `page`/`size`, y una `*All`
 * que es el prefijo común a todas las páginas de ese recurso. Las mutaciones invalidan la `*All`
 * y no las concretas: en un listado paginado no se sabe qué páginas están en caché, y
 * `invalidateQueries` con un prefijo las marca todas como viejas de una. La clave se llama
 * `*All` y no `*` justamente para que el prefijo sea explícito y no se confunda con un comodín.
 *
 * `agendaAll` y `publicadoresAll` son prefijos distintos a propósito: los eventos que muestra la
 * agenda semanal y los que muestra el listado completo no son el mismo conjunto, así que crear o
 * modificar un evento tiene que refrescar las dos por separado.
 *
 * Las funciones son `as const` para que TypeScript mantenga la forma literal y no la widen a
 * `string[]`, que es lo que rompería el type-checking de `queryKey`.
 */
export const queryKeys = {
  agenda: (page: number, size: number) => ['agenda', { page, size }] as const,
  agendaAll: () => ['agenda'] as const,
  eventos: (page: number, size: number) => ['eventos', { page, size }] as const,
  eventosAll: () => ['eventos'] as const,
  evento: (id: number) => ['evento', id] as const,
  publicadores: (page: number, size: number) => ['publicadores', { page, size }] as const,
  publicadoresAll: () => ['publicadores'] as const,
  publicador: (id: number) => ['publicador', id] as const,
  publicadorEventos: (id: number, page: number, size: number) =>
    ['publicador', id, 'eventos', { page, size }] as const,
  /**
   * Prefijo de los eventos de un publicador. No es `['publicador', id]` a propósito: eso
   * matchearía también el detalle del publicador, que no tiene por qué refetchearse cuando
   * cambia uno de sus eventos.
   */
  publicadorEventosAll: (id: number) => ['publicador', id, 'eventos'] as const,
}

/** Construye `?page=&size=` omitiendo los valores por defecto. */
export function pageParams(page: number, size: number): string {
  return `?page=${page}&size=${size}`
}

export function getPage<T>(path: string, signal?: AbortSignal): Promise<Page<T>> {
  return apiGet<Page<T>>(path, signal)
}
