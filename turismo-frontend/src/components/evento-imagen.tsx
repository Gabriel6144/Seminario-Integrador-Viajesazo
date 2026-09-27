import { ImageOffIcon } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Imagen de un evento, con respaldo si la carga falla.
 *
 * Las URLs de `imagenes` vienen del seed (`https://cdn.cordoba.gob.ar/...`) y **no resuelven**:
 * son datos de ejemplo y no hay ningún CDN detrás. Sin manejar el error de carga, el navegador
 * pinta su ícono de imagen rota en cada tarjeta con fotos, que se confunde con un bug de la app.
 */
export function EventoImagen({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (imagen no disponible)`}
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed bg-muted text-muted-foreground',
          className,
        )}
      >
        <ImageOffIcon aria-hidden className="size-6" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      // `onError` cambia el estado y React reemplaza el `img` por el respaldo: la imagen rota
      // desaparece en vez de quedar visible.
      onError={() => setFailed(true)}
      className={cn('rounded-lg border object-cover', className)}
    />
  )
}
