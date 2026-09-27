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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">Publicadores</h2>
          <p className="text-sm text-muted-foreground">
            Organismos y asociaciones que cargan eventos en la plataforma.
          </p>
        </div>

        <Button asChild size="sm">
          <Link to="/publicadores/nuevo">
            <PlusIcon data-icon="inline-start" aria-hidden />
            Nuevo publicador
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
    <Card className="relative flex flex-col">
      <CardHeader>
        <CardTitle className="line-clamp-1">
          <Link
            to={`/publicadores/${publicador.id}`}
            className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
          >
            {publicador.nombre}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <MailIcon aria-hidden className="size-3.5" />
          {publicador.email}
        </CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <PhoneIcon aria-hidden className="size-3.5" />
          {publicador.telefono ?? 'Sin teléfono'}
        </span>
      </CardFooter>
    </Card>
  )
}
