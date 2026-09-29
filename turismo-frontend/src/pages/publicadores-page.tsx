import { MailIcon, PhoneIcon, PlusIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePublicadores } from '@/api/publicadores'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { usePageParam } from '@/lib/use-page-param'
import type { PublicadorResponse } from '@/types/api'

/**
 * Listado de publicadores — `GET /api/publicadores?page=&size=`.
 *
 * El backend los ordena alfabéticamente (`findAllByOrderByNombreAsc`), así que la grilla sale en
 * ese orden sin ordenar del lado del cliente.
 */
export function PublicadoresPage() {
  const [page, setPage] = usePageParam()
  const query = usePublicadores(page)

  return (
    <div className="flex flex-col gap-6">
      {/* Header con título y botón */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
            Publicadores
          </h2>
          <p className="text-sm text-[#3f484e]">
            Organismos y asociaciones que cargan eventos en la plataforma.
          </p>
        </div>

        <Button asChild size="sm" className="h-12 rounded-xl bg-[#00658d] px-6 text-white shadow-md hover:bg-[#65b7e8]">
          <Link to="/publicadores/nuevo">
            <PlusIcon className="h-5 w-5" aria-hidden />
            + Nuevo publicador
          </Link>
        </Button>
      </div>

      {/*
        Cadena `if` y no siblings con `&&`: durante `isPending` `data` es `undefined`, y un
        `data?.content.length === 0` pintado aparte saldría encima del skeleton.
      */}
      {query.isPending ? <GridSkeleton count={3} /> : null}
      {query.isError ? <ErrorState error={query.error} /> : null}

      {query.isSuccess && query.data.content.length === 0 ? (
        <EmptyState
          title="No hay publicadores cargados"
          description="El seed siembra tres publicadores al arrancar la API."
        />
      ) : null}

      {query.isSuccess && query.data.content.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.content.map((publicador) => (
            <PublicadorCard key={publicador.id} publicador={publicador} />
          ))}
        </div>
      ) : null}

      {query.data === undefined ? null : (
        <PaginationBar page={query.data} onPageChange={setPage} />
      )}
    </div>
  )
}

function PublicadorCard({ publicador }: { publicador: PublicadorResponse }) {
  return (
    <Card className="relative flex flex-col rounded-2xl bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)]">
      <CardHeader>
        <CardTitle className="line-clamp-1 font-heading text-lg font-bold text-[#191c1e]">
          <Link
            to={`/publicadores/${publicador.id}`}
            className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
          >
            {publicador.nombre}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-[#3f484e]">
          <MailIcon className="h-3.5 w-3.5" aria-hidden />
          {publicador.email}
        </CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto border-t border-[#e0e3e5] pt-3 text-sm text-[#3f484e]">
        <span className="inline-flex items-center gap-1.5">
          <PhoneIcon className="h-3.5 w-3.5" aria-hidden />
          {publicador.telefono ?? 'Sin teléfono'}
        </span>
      </CardFooter>
    </Card>
  )
}
