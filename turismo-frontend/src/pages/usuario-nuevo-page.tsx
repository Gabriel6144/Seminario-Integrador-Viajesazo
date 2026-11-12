import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useCrearUsuario } from '@/api/usuarios'
import { UsuarioForm } from '@/components/usuario-form'
import { toUserMessage } from '@/lib/http'
import { toUsuarioRequest, type UsuarioFormValues } from '@/lib/schemas'

export function UsuarioNuevoPage() {
  const navigate = useNavigate()
  const crear = useCrearUsuario()
  const [serverError, setServerError] = useState<string | null>(null)

  const defaultValues: UsuarioFormValues = {
    nombre: '',
    apellido: '',
    email: '',
    rol: 'TURISTA',
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-6">
      <div className="w-full max-w-2xl text-xs text-muted-foreground sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="cursor-pointer hover:text-sky-700">Usuarios</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-medium text-sky-700">Nuevo Registro</span>
        </div>
      </div>

      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="relative bg-gradient-to-r from-[#5ab2e6] to-[#3a97cf] p-6 text-white sm:p-8">
          <div className="max-w-md">
            <span className="mb-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              Alta de Usuario
            </span>
            <h2 className="font-heading text-xl font-extrabold tracking-tight sm:text-2xl">Crear credencial en el sistema</h2>
            <p className="mt-1 text-xs text-sky-50 sm:text-sm">Completa los datos personales y asigna los permisos operativos correspondientes.</p>
          </div>
          <div className="pointer-events-none absolute right-6 top-6 hidden opacity-15 sm:block">
            <span className="material-symbols-outlined text-7xl">person_add</span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <UsuarioForm
            defaultValues={defaultValues}
            isPending={crear.isPending}
            serverError={serverError}
            onCancel={() => navigate('/usuarios')}
            onSubmit={(values) => {
              setServerError(null)
              crear.mutate(toUsuarioRequest(values), {
                onSuccess: () => {
                  toast.success('¡Usuario registrado con éxito en el sistema!')
                  navigate('/usuarios')
                },
                onError: (error) => setServerError(toUserMessage(error)),
              })
            }}
          />
        </div>
      </div>

      <div className="w-full max-w-2xl text-center text-xs text-muted-foreground">
        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-amber-200">Plantilla frontend</span>{' '}
        Los datos se guardan en mock local hasta conectar el backend (<code>/api/usuarios</code>).
      </div>
    </div>
  )
}
