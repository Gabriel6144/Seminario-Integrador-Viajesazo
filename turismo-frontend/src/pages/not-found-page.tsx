import { CompassIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

/** Ruta sin coincidencia (`*`). */
export function NotFoundPage() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CompassIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Página no encontrada</EmptyTitle>
        <EmptyDescription>
          La dirección no corresponde a ninguna sección del sitio.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild size="sm">
          <Link to="/">Ir al listado de eventos</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
