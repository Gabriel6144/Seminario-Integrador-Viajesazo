import { cn } from '@/lib/utils'

/**
 * Badge de estado para eventos y publicadores.
 *
 * Variantes:
 * - `publicado`: Badge rojo con punto indicador (evento activo)
 * - `verificado`: Badge azul con ícono de verificación
 * - `borrador`: Badge gris para eventos en borrador
 * - `inactivo`: Badge gris para eventos dados de baja
 */
type StatusBadgeVariant = 'publicado' | 'verificado' | 'borrador' | 'inactivo'

const STATUS_STYLES: Record<StatusBadgeVariant, string> = {
  publicado: 'bg-[#df2a29] text-white',
  verificado: 'bg-[#eaf6fc] text-[#00658d] border border-[#65b7e8]/40',
  borrador: 'bg-[#e0e3e5] text-[#3f484e]',
  inactivo: 'bg-[#e0e3e5] text-[#3f484e]',
}

const STATUS_LABELS: Record<StatusBadgeVariant, string> = {
  publicado: 'Publicado',
  verificado: 'Verificado',
  borrador: 'Borrador',
  inactivo: 'Inactivo',
}

export function StatusBadge({
  variant,
  className,
}: {
  variant: StatusBadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm',
        STATUS_STYLES[variant],
        className,
      )}
    >
      {variant === 'publicado' && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      )}
      {variant === 'verificado' && (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      )}
      {STATUS_LABELS[variant]}
    </span>
  )
}
