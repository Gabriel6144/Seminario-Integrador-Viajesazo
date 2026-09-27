import { ArrowLeftIcon } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'

import { useEventosDePublicador, usePublicador } from '@/api/publicadores'
import { EventoCard } from '@/components/evento-card'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { parseId } from '@/lib/parse-id'
import { usePageParam } from '@/lib/use-page-param'

/**
 * Detalle de un publicador y sus eventos.
 *
 * Son dos requests independientes: `GET /api/publicadores/{id}` para el encabezado y
 * `GET /api/publicadores/{id}/eventos` para la grilla. TanStack Query corre los dos en paralelo
 * sin necesidad de orquestarlos a mano.
 */
export function PublicadorDetailPage() {
  const { id: rawId } = useParams()
  const id = parseId(rawId)

  const [page, setPage] = usePageParam()
  const publicadorQuery = usePublicador(id)
  const eventosQuery = useEventosDePublicador(id, page)

  if (id === null) {
    return (
      <div className="flex flex-col gap-4">
        <Volver />
        <Alert variant="destructive">
          <AlertTitle>Identificador inválido</AlertTitle>
          <AlertDescription>
            La dirección no corresponde a un publicador: el id tiene que ser un número entero.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Volver />

      {publicadorQuery.isPending ? <EncabezadoSkeleton /> : null}
      {publicadorQuery.isError ? <ErrorState error={publicadorQuery.error} /> : null}

      {publicadorQuery.data === undefined ? null : (
        <Card>
          <CardHeader>
            {/* `CardTitle` es un `div` fijo: el nombre se compone como `<h2>` a mano. */}
            <h2 className="text-2xl font-semibold tracking-tight">
              {publicadorQuery.data.nombre}
            </h2>
            <CardDescription>
              {publicadorQuery.data.email}
              {publicadorQuery.data.telefono === null
                ? ''
                : ` · ${publicadorQuery.data.telefono}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator />
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Eventos del publicador</h2>

        {eventosQuery.isPending ? <GridSkeleton count={3} /> : null}
        {eventosQuery.isError ? <ErrorState error={eventosQuery.error} /> : null}

        {/*
          Un publicador sin eventos devuelve 200 con la página vacía, no 404: es un estado vacío
          normal. La condición exige `isSuccess` porque durante `isPending` `data` es `undefined` y
          el mensaje saldría encima del skeleton.
        */}
        {eventosQuery.isSuccess && eventosQuery.data.content.length === 0 ? (
          <EmptyState
            title="Sin eventos cargados"
            description="Este publicador todavía no publicó ningún evento."
          />
        ) : null}

        {eventosQuery.isSuccess && eventosQuery.data.content.length > 0 ? (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy={eventosQuery.isPlaceholderData}
          >
            {eventosQuery.data.content.map((evento) => (
              <EventoCard key={evento.id} evento={evento} />
            ))}
          </div>
        ) : null}

        {eventosQuery.data === undefined ? null : (
          <PaginationBar page={eventosQuery.data} onPageChange={setPage} />
        )}
      </section>
    </div>
  )
}

function Volver() {
  return (
    <Button asChild variant="ghost" size="sm" className="self-start">
      {/* `Link` y no un `<a href>`: un anchor normal recarga la página entera y tira el router. */}
      <Link to="/publicadores">
        <ArrowLeftIcon data-icon="inline-start" aria-hidden />
        Volver a publicadores
      </Link>
    </Button>
  )
}

function EncabezadoSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex flex-col gap-3 rounded-xl border p-6"
    >
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
