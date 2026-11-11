import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { useBajaUsuario, useUsuarios } from '@/api/usuarios'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UsuarioBajaDialog } from '@/components/usuario-baja-dialog'
import { usePageParam } from '@/lib/use-page-param'
import { cn } from '@/lib/utils'
import type { RolUsuario, UsuarioResponse } from '@/types/api'

type RolFiltro = RolUsuario | 'TODOS'

function initials(u: UsuarioResponse) {
  return `${u.nombre.trim()[0] ?? ''}${u.apellido.trim()[0] ?? ''}`.toUpperCase() || 'U'
}

function formatFecha(fecha: string | null) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return fecha
  return d.toLocaleDateString('es-AR')
}

function rolBadgeClass(rol: RolUsuario) {
  if (rol === 'TURISTA') return 'bg-[#E1F3FD] text-[#0277BD] border-blue-200'
  if (rol === 'PUBLICADOR') return 'bg-[#FDF5E6] text-[#B27B08] border-amber-200'
  return 'bg-[#FDE8E8] text-[#C62828] border-red-200'
}

function avatarClass(rol: RolUsuario) {
  if (rol === 'TURISTA') return 'bg-[#E1F3FD] text-[#0277BD] border-blue-200'
  if (rol === 'PUBLICADOR') return 'bg-[#FDF5E6] text-[#B27B08] border-amber-200'
  return 'bg-[#FDE8E8] text-[#C62828] border-red-200'
}

export function UsuariosPage() {
  const [page, setPage] = usePageParam()
  const [search, setSearch] = useState('')
  const [rolFiltro, setRolFiltro] = useState<RolFiltro>('TODOS')
  const [selected, setSelected] = useState<UsuarioResponse | null>(null)
  const [openBaja, setOpenBaja] = useState(false)

  const query = useUsuarios(page, { q: search, rol: rolFiltro })
  const baja = useBajaUsuario()

  const items = query.data?.content ?? []
  const total = query.data?.page.totalElements ?? 0
  const activos = items.filter((u) => u.estado === 'ACTIVO').length

  const counts = useMemo(() => {
    const base = { TODOS: items.length, TURISTA: 0, PUBLICADOR: 0, ADMINISTRADOR: 0 } as Record<RolFiltro, number>
    for (const u of items) base[u.rol]++
    return base
  }, [items])

  const openBajaModal = (u: UsuarioResponse) => {
    setSelected(u)
    setOpenBaja(true)
  }

  const confirmBaja = () => {
    if (!selected) return
    baja.mutate(selected.id, {
      onSuccess: () => {
        toast.success(`El usuario ${selected.nombre} ${selected.apellido} ha sido dado de baja.`)
        setOpenBaja(false)
        setSelected(null)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'No se pudo dar de baja el usuario.')
      },
    })
  }

  const filtros: { key: RolFiltro; label: string }[] = [
    { key: 'TODOS', label: `Todos (${rolFiltro === 'TODOS' ? total : counts.TODOS})` },
    { key: 'TURISTA', label: `Turistas (${counts.TURISTA})` },
    { key: 'PUBLICADOR', label: `Publicadores (${counts.PUBLICADOR})` },
    { key: 'ADMINISTRADOR', label: `Administradores (${counts.ADMINISTRADOR})` },
  ]

  return (
    <div className="flex flex-col gap-6 pb-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-sky-700" title="Volver">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-heading text-lg font-bold leading-tight text-gray-900 sm:text-2xl">Listado de Usuarios</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Gestión integral de usuarios y permisos en Viajesazo</p>
          </div>
        </div>
        <Button asChild className="hidden bg-[#5ab2e6] text-white hover:bg-[#4aa4d9] sm:inline-flex">
          <Link to="/usuarios/nuevo">
            <span className="material-symbols-outlined text-lg">add</span>
            + Nuevo Usuario
          </Link>
        </Button>
      </header>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 md:flex-row md:items-center">
        <div className="relative max-w-md flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-sky-500">search</span>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Buscar por nombre, apellido o email..."
            className="rounded-xl bg-gray-50/50 pl-11"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {filtros.map((f) => {
            const active = rolFiltro === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setRolFiltro(f.key)
                  setPage(0)
                }}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                  active
                    ? 'border-[#5AB2E6] bg-[#5AB2E6] text-white shadow-sm'
                    : 'border-[#E0E5E9] bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-700">{total} usuarios registrados</span>
          <span>•</span>
          <span className="flex items-center gap-1 font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {activos} activos (página)
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
            Plantilla frontend · mock local (conectar backend en src/api/usuarios.ts)
          </span>
        </div>
      </div>

      {query.isPending ? <GridSkeleton count={4} /> : null}
      {query.isError ? <ErrorState error={query.error} /> : null}

      {query.isSuccess && items.length === 0 ? (
        <EmptyState title="No se encontraron usuarios" description="Probá ajustando la búsqueda o el filtro de rol." />
      ) : null}

      {query.isSuccess && items.length > 0 ? (
        <>
          <div className="space-y-3.5 md:hidden">
            {items.map((u) => (
              <div key={u.id} className="space-y-3 rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border font-heading text-sm font-bold', avatarClass(u.rol))}>
                      {initials(u)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-sm font-bold leading-tight text-gray-900">{u.nombre} {u.apellido}</h3>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  {u.estado === 'INACTIVO' ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">INACTIVO</span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                  <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold', rolBadgeClass(u.rol))}>
                    {u.rol}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span className="material-symbols-outlined text-sm">calendar_month</span> {formatFecha(u.fechaAlta)}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-gray-50 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-8 border-blue-100 bg-[#E1F3FD] text-xs text-[#0277BD] opacity-70"
                    title="Edición pendiente de definir con backend"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openBajaModal(u)}
                    disabled={u.estado === 'INACTIVO'}
                    className="h-8 border-red-200 bg-[#FDE8E8] text-xs text-[#C62828] hover:bg-red-100"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span> Dar de baja
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Fecha Alta</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {items.map((u) => (
                    <tr key={u.id} className="transition hover:bg-gray-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('flex h-9 w-9 items-center justify-center rounded-full border font-heading text-xs font-bold', avatarClass(u.rol))}>
                            {initials(u)}
                          </div>
                          <div>
                            <p className="font-heading font-bold leading-tight text-gray-900">{u.nombre} {u.apellido}</p>
                            <p className="text-xs text-muted-foreground">{u.estado === 'INACTIVO' ? 'Inactivo' : 'Activo'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">{u.email}</td>
                      <td className="px-6 py-4 text-xs text-gray-600">{formatFecha(u.fechaAlta)}</td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', rolBadgeClass(u.rol))}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="h-8 border-blue-100 bg-[#E1F3FD] text-xs text-[#0277BD] opacity-70"
                            title="Edición pendiente de definir con backend"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openBajaModal(u)}
                            disabled={u.estado === 'INACTIVO'}
                            className="h-8 border-red-200 bg-[#FDE8E8] text-xs text-[#C62828] hover:bg-red-100"
                          >
                            Dar de baja
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {query.data ? <PaginationBar page={query.data} onPageChange={setPage} /> : null}

      <div className="sm:hidden">
        <Button asChild className="w-full bg-[#5ab2e6] text-white hover:bg-[#4aa4d9]">
          <Link to="/usuarios/nuevo">+ Nuevo Usuario</Link>
        </Button>
      </div>

      <UsuarioBajaDialog
        usuario={selected}
        open={openBaja}
        onOpenChange={(o) => {
          setOpenBaja(o)
          if (!o) setSelected(null)
        }}
        onConfirm={confirmBaja}
        isPending={baja.isPending}
      />
    </div>
  )
}
