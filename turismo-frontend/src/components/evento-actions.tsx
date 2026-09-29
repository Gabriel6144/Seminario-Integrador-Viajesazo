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
  imagen?: string
  fecha?: string
}

/**
 * Acciones de escritura sobre un evento: editar y borrar.
 *
 * La baja es **física** en el backend, o sea que no hay forma de deshacerla desde la app. Por eso
 * va detrás de un `AlertDialog` que repite el nombre del evento: un "Borrar" genérico en una
 * pantalla con un botón al lado es la forma más corta de perder datos sin querer.
 */
export function EventoActions({ id, nombre, publicadorId, imagen, fecha }: EventoActionsProps) {
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
            Dar de baja
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#ffdad6]/60">
                <svg className="h-6 w-6 text-[#ba1a1a]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <AlertDialogTitle className="font-heading text-lg font-bold text-[#191c1e]">
                    Dar de baja evento
                  </AlertDialogTitle>
                </div>
                <span className="mt-1 inline-block text-sm font-semibold text-[#ba1a1a]">
                  Acción destructiva permanente
                </span>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Preview del evento */}
          <div className="flex items-center gap-3 rounded-lg border border-[#e0e3e5] bg-[#f2f4f6] p-3">
            {imagen && (
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#d8dadc]">
                <img src={imagen} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {fecha && (
                <div className="flex items-center gap-1 text-sm font-semibold text-[#7a5900]">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Fecha: {fecha}</span>
                </div>
              )}
              <h4 className="mt-0.5 truncate text-sm font-bold text-[#191c1e]" title={nombre}>
                {nombre}
              </h4>
              <p className="truncate text-xs text-[#3f484e]">Turismo Córdoba Oficial</p>
            </div>
          </div>

          {/* Mensaje de confirmación */}
          <div className="border-l-4 border-[#00658d] bg-[#ffdad6]/20 p-3 rounded-r-lg">
            <p className="text-sm leading-relaxed text-[#191c1e]">
              ¿Está seguro de que desea dar de baja este evento? Esta acción quitará el evento de la agenda y dejará de estar disponible como evento registrado.
            </p>
          </div>

          {/* Notificación */}
          <div className="flex items-center gap-2 text-sm text-[#3f484e]">
            <svg className="h-4 w-4 text-[#3f484e]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Los usuarios suscritos a recordatorios recibirán una notificación de cancelación.</span>
          </div>

          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-[#e0e3e5]/60 pt-4">
            <AlertDialogCancel className="w-full rounded-xl border border-[#70787f]/40 px-6 py-3 font-semibold text-[#191c1e] hover:bg-[#e0e3e5] sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarBaja}
              disabled={borrar.isPending}
              className="w-full rounded-xl bg-[#00658d] px-6 py-3 font-bold text-white shadow-md hover:bg-[#65b7e8] sm:w-auto"
            >
              {borrar.isPending ? 'Borrando…' : 'Confirmar baja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
