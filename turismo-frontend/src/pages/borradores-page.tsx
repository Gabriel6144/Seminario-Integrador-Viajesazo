import { useState } from 'react'

import { useBorradores, useDescartarBorrador } from '@/api/viajes'
import { ViajeBorradorCard } from '@/components/viaje-borrador-card'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { usePageParam } from '@/lib/use-page-param'
import { Link } from 'react-router-dom'

const USUARIO_DEMO = 'turista_demo'

export function BorradoresPage() {
  const [page, setPage] = usePageParam()
  const query = useBorradores(USUARIO_DEMO, page)
  const descartar = useDescartarBorrador()
  const [accionandoId, setAccionandoId] = useState<number | null>(null)

  const handleDescartar = (id: number) => {
    setAccionandoId(id)
    descartar.mutate(id, {
      onSettled: () => setAccionandoId(null),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
            Mis Viajes
          </h2>
          <p className="text-sm text-[#3f484e]">
            Circuitos guardados como borrador para retomarlos después.
          </p>
        </div>

        <Button asChild size="sm" className="h-12 rounded-xl bg-[#00658d] px-6 text-white shadow-md hover:bg-[#65b7e8]">
          <Link to="/planificar">+ Planificar un viaje nuevo</Link>
        </Button>
      </div>

      {query.isPending ? <GridSkeleton /> : null}
      {query.isError ? <ErrorState error={query.error} /> : null}
      {query.data && query.data.content.length === 0 ? (
        <EmptyState
          title="Todavía no hay borradores"
          description="Guardá un borrador desde el planificador para verlo acá."
        />
      ) : null}

      {query.data && query.data.content.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={query.isPlaceholderData}>
          {query.data.content.map((borrador) => (
            <ViajeBorradorCard
              key={borrador.id}
              borrador={borrador}
              onDescartar={handleDescartar}
              descartando={accionandoId === borrador.id && descartar.isPending}
            />
          ))}
        </div>
      ) : null}

      {query.data === undefined ? null : <PaginationBar page={query.data} onPageChange={setPage} />}
    </div>
  )
}