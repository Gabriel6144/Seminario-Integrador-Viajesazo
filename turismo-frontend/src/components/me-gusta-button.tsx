import { HeartIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useDarMeGusta, useMeGusta, useQuitarMeGusta } from '@/api/me-gustas'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { toUserMessage } from '@/lib/http'

interface MeGustaButtonProps {
  propuestaId: number
}

/**
 * Toggle Me gusta para TURISTA sobre un evento o actividad.
 * PUBLICADOR no lo ve (sigue con Editar / Dar de baja).
 */
export function MeGustaButton({ propuestaId }: MeGustaButtonProps) {
  const { hasRole, isAuthenticated } = useAuth()
  const isTurista = isAuthenticated && hasRole('TURISTA') && !hasRole('PUBLICADOR') && !hasRole('ADMINISTRADOR')
  const query = useMeGusta(propuestaId, isTurista)
  const dar = useDarMeGusta()
  const quitar = useQuitarMeGusta()

  if (!isTurista) return null

  const liked = query.data?.meGusta === true
  const total = query.data?.total ?? 0
  const pending = dar.isPending || quitar.isPending || query.isPending

  function toggle() {
    if (liked) {
      quitar.mutate(propuestaId, {
        onError: (error) => toast.error(toUserMessage(error)),
      })
      return
    }
    dar.mutate(propuestaId, {
      onError: (error) => toast.error(toUserMessage(error)),
    })
  }

  return (
    <Button
      type="button"
      variant={liked ? 'default' : 'outline'}
      size="sm"
      disabled={pending}
      onClick={toggle}
      className={
        liked
          ? 'rounded-full bg-[#ba1a1a] text-white hover:bg-[#9b1515]'
          : 'rounded-full'
      }
      aria-pressed={liked}
    >
      <HeartIcon
        data-icon="inline-start"
        aria-hidden
        className={liked ? 'fill-current' : undefined}
      />
      {liked ? 'Te gusta' : 'Me gusta'}
      {total > 0 ? <span className="ml-1 tabular-nums opacity-90">({total})</span> : null}
    </Button>
  )
}
