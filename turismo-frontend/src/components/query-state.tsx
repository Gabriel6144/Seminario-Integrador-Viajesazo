import { AlertCircleIcon, SearchXIcon } from 'lucide-react'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toUserMessage } from '@/lib/http'

/**
 * Estados de carga, error y vacío de las páginas de listado.
 *
 * Los tres son estados de primera clase, no bordes: `content: []` con 200 es una respuesta
 * válida del backend (publicador sin eventos, base recién arrancada) y no un error.
 */

/** Placeholders con la misma silueta que la grilla, para que no salte el layout al cargar. */
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon aria-hidden />
      <AlertTitle>No se pudo cargar la información</AlertTitle>
      <AlertDescription>{toUserMessage(error)}</AlertDescription>
    </Alert>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
