import { CalendarDaysIcon, ClockIcon, MapPinIcon, UserIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CategoriaBadge } from '@/components/categoria-badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateRange, formatTimeRange } from '@/lib/dates'
import type { EventoResponse } from '@/types/api'

/**
 * Tarjeta de evento para las grillas de listado.
 *
 * Solo presentación: no pide datos ni conoce la paginación, así se puede reutilizar en el
 * listado, la agenda y la página del publicador sin ajustes.
 */
export function EventoCard({ evento }: { evento: EventoResponse }) {
  const horario = formatTimeRange(evento.horarioInicio, evento.horarioFin)

  return (
    <Card className="group relative flex flex-col transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CategoriaBadge categoria={evento.categoria} />
          {evento.localidad === null ? null : (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPinIcon aria-hidden />
              {evento.localidad}
            </span>
          )}
        </div>
        <CardTitle className="line-clamp-2">
          <Link
            to={`/eventos/${evento.id}`}
            className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
          >
            {evento.nombre}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <CalendarDaysIcon aria-hidden />
          {formatDateRange(evento.fechaInicio, evento.fechaFin)}
        </span>
        {horario === null ? null : (
          <span className="flex items-center gap-2">
            <ClockIcon aria-hidden />
            {horario}
          </span>
        )}
        <span className="flex items-center gap-2">
          <UserIcon aria-hidden />
          {evento.publicadorNombre}
        </span>
      </CardContent>

      <CardFooter>
        {/* El link "plano" además del título: el `after:absolute` del título cubre el área
            clickeable de la tarjeta, y este queda para teclado y lector de pantalla. */}
        <Link
          to={`/eventos/${evento.id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Ver detalle
        </Link>
      </CardFooter>
    </Card>
  )
}
