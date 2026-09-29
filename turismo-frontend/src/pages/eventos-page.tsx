import { PlusIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EventoCard } from '@/components/evento-card'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { useEventos } from '@/api/eventos'
import { Button } from '@/components/ui/button'
import { usePageParam } from '@/lib/use-page-param'

/**
 * Listado completo de eventos — `GET /api/eventos?page=&size=`.
 *
 * Es la home del sitio. El backend no expone filtros ni búsqueda, así que el listado trae todo
 * sin condiciones; cuando se sumen, el filtrado va al servidor y la `queryKey` cambia.
 */
export function EventosPage() {
  const [page, setPage] = usePageParam()
  const query = useEventos(page)

  return (
    <div className="flex flex-col gap-6">
      {/* Header con título y botón */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
            Eventos turísticos
          </h2>
          <p className="text-sm text-[#3f484e]">
            Todos los eventos cargados, ordenados por fecha de inicio.
          </p>
        </div>

        <Button asChild size="sm" className="h-12 rounded-xl bg-[#00658d] px-6 text-white shadow-md hover:bg-[#65b7e8]">
          <Link to="/eventos/nuevo">
            <PlusIcon className="h-5 w-5" aria-hidden />
              Nuevo evento
          </Link>
        </Button>
      </div>

      <EventosGrid query={query} />

      {query.data === undefined ? null : (
        <PaginationBar page={query.data} onPageChange={setPage} />
      )}
    </div>
  )
}

/**
 * Grilla de eventos con sus tres estados.
 *
 * `isPending` es la primera carga; con `keepPreviousData`, al paginar la query queda en
 * `isPlaceholderData` y hay que mostrar el skeleton encima de los datos viejos, no en lugar de
 * ellos, para que la grilla no desaparezca entre páginas.
 */
function EventosGrid({ query }: { query: ReturnType<typeof useEventos> }) {
  if (query.isPending) return <GridSkeleton />
  if (query.isError) return <ErrorState error={query.error} />
  if (query.data.content.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay eventos"
        description="La base se carga con el seed al arrancar la API. Si esperabas eventos, probá recargando la página."
      />
    )
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy={query.isPlaceholderData}
    >
      {query.data.content.map((evento) => (
        <EventoCard key={evento.id} evento={evento} />
      ))}
    </div>
  )
}
