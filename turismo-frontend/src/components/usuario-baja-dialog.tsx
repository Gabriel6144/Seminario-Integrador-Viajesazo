import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RolUsuario, UsuarioResponse } from '@/types/api'

interface UsuarioBajaDialogProps {
  usuario: UsuarioResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

function initials(nombre: string, apellido: string) {
  return `${nombre.trim()[0] ?? ''}${apellido.trim()[0] ?? ''}`.toUpperCase() || 'U'
}

function rolBadgeClass(rol: RolUsuario) {
  if (rol === 'TURISTA') return 'bg-sky-100 text-sky-800 border-sky-200'
  if (rol === 'PUBLICADOR') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

export function UsuarioBajaDialog({ usuario, open, onOpenChange, onConfirm, isPending }: UsuarioBajaDialogProps) {
  const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido}` : ''
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[420px] rounded-t-3xl p-0 sm:rounded-2xl sm:p-0">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>
        <AlertDialogHeader className="p-6 pb-2 text-center sm:p-7 sm:pb-3">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 ring-8 ring-red-50">
            <span className="material-symbols-outlined text-3xl text-red-600">delete</span>
          </div>
          <AlertDialogTitle className="font-heading text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
            ¿Dar de baja usuario?
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-1 text-xs leading-relaxed text-gray-600 sm:text-sm">
            {usuario
              ? `Esta acción deshabilitará al usuario ${nombreCompleto} (${usuario.email}) del sistema.`
              : 'Esta acción deshabilitará al usuario seleccionado del sistema.'}
          </AlertDialogDescription>

          {usuario ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-100 font-heading text-sm font-bold text-blue-700">
                  {initials(usuario.nombre, usuario.apellido)}
                </div>
                <div className="min-w-0">
                  <h4 className="truncate font-heading text-sm font-bold text-gray-900">{nombreCompleto}</h4>
                  <p className="truncate font-mono text-xs text-muted-foreground">{usuario.email}</p>
                </div>
              </div>
              <span className={cn('inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold', rolBadgeClass(usuario.rol))}>
                {usuario.rol}
              </span>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/70 p-2.5 text-left text-xs text-red-700">
            <span className="material-symbols-outlined flex-shrink-0 text-base">warning</span>
            <span>Se revocarán todos los tokens y permisos activos de forma inmediata (según comportamiento del backend).</span>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="border-t border-gray-100 bg-gray-50/80 p-4 sm:flex-row-reverse sm:justify-end sm:p-6">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="w-full bg-[#d32f2f] hover:bg-[#b71c1c] sm:w-auto"
          >
            {isPending ? 'Dando de baja…' : 'Sí, Dar de Baja'}
          </Button>
          <AlertDialogCancel disabled={isPending} className="mt-0 w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
