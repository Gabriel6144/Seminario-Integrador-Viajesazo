import { useAgendaSemanal } from '@/api/agenda'
import { DayHeading } from '@/components/day-heading'
import { EventoCard } from '@/components/evento-card'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { Separator } from '@/components/ui/separator'
import { groupByDay } from '@/lib/group-by-day'
import { usePageParam } from '@/lib/use-page-param'

/**
 * Agenda de la semana — `GET /api/agenda/semanal?page=&size=`.
 *
 * La ventana la define el backend con su propio reloj y va **de hoy al domingo**, no de lunes a
 * domingo: los eventos que ya terminaron durante la semana quedan afuera. Por eso el contenido
 * cambia según el día de la semana en que se levante la app — con el seed actual van de 2 eventos
 * (domingo) a 4 (miércoles). No se puede fijar un total esperado.
 */
export function AgendaPage() {
  const [page, setPage] = usePageParam()
  const query = useAgendaSemanal(page)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Agenda de la semana</h2>
        <p className="text-sm text-muted-foreground">
          Eventos que siguen vigentes desde hoy hasta el domingo.
        </p>
      </div>

      {/*
        Los cuatro estados van en una cadena `if`, no en siblings con `&&`: durante `isPending`
        `data` todavía es `undefined`, así que un `data?.content.length === 0` pintado aparte
        mostraría el mensaje de "no hay eventos" encima del skeleton.
      */}
      {query.isPending ? <GridSkeleton /> : null}

      {query.isError ? <ErrorState error={query.error} /> : null}

      {query.isSuccess && query.data.content.length === 0 ? (
        <EmptyState
          title="No hay eventos esta semana"
          description="Ningún evento cargado se solapa con la ventana de hoy al domingo."
        />
      ) : null}

      {query.isSuccess && query.data.content.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groupByDay(query.data.content).map(([date, eventos]) => (
            <section key={date} className="flex flex-col gap-3">
              <DayHeading date={date} />
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {eventos.map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {query.data === undefined ? null : (
        <PaginationBar page={query.data} onPageChange={setPage} />
      )}
    </div>
  )
}
