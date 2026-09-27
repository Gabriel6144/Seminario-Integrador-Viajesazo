import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { useBorrarEvento } from '@/api/eventos'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toUserMessage } from '@/lib/http'

interface EventoActionsProps {
  id: number
  nombre: string
  publicadorId: number
}

/**
 * Acciones de escritura sobre un evento: editar y borrar.
 *
 * La baja es **física** en el backend, o sea que no hay forma de deshacerla desde la app. Por eso
 * va detrás de un `AlertDialog` que repite el nombre del evento: un "Borrar" genérico en una
 * pantalla con un botón al lado es la forma más corta de perder datos sin querer.
 */
export function EventoActions({ id, nombre, publicadorId }: EventoActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const borrar = useBorrarEvento()

  function confirmarBaja() {
    borrar.mutate(
      { id, publicadorId },
      {
        onSuccess: () => {
          setIsOpen(false)
          toast.success('Evento eliminado')
          // Se vuelve al listado y no al detalle: el detalle ya no existe y quedarse ahí
          // mostraría un error de 404 justo después de una operación exitosa.
          navigate('/')
        },
        onError: (error) => {
          setIsOpen(false)
          toast.error(toUserMessage(error))
        },
      },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to={`/eventos/${id}/editar`}>
          <PencilIcon data-icon="inline-start" aria-hidden />
          Editar
        </Link>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={borrar.isPending}>
            <Trash2Icon data-icon="inline-start" aria-hidden />
            Borrar
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar “{nombre}”?</AlertDialogTitle>
            <AlertDialogDescription>
              El evento se elimina de la base y no se puede deshacer. Esta acción no afecta al
              publicador.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarBaja}
              disabled={borrar.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {borrar.isPending ? 'Borrando…' : 'Sí, borrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
