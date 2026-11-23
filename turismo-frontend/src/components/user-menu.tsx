import { ChevronDown, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface UserMenuProps {
  nombre: string
  email?: string
  roles?: string[]
  onLogout: () => void
}

function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return 'U'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

function resolverRolLabel(roles?: string[]): string {
  if (roles?.includes('ADMINISTRADOR')) return 'Administrador'
  if (roles?.includes('PUBLICADOR')) return 'Publicador'
  return 'Turista'
}

/**
 * Menú desplegable de cuenta en la barra superior: muestra avatar, nombre, email, rol y "Cerrar sesión".
 */
export function UserMenu({ nombre, email, roles, onLogout }: UserMenuProps) {
  const [abierto, setAbierto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAbierto(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [abierto])

  const iniciales = obtenerIniciales(nombre)
  const rolLabel = resolverRolLabel(roles)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={abierto}
        aria-haspopup="menu"
        onClick={() => setAbierto((prev) => !prev)}
        className="flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 px-3 text-[13px] font-medium text-[#3f484e] transition-colors hover:bg-slate-200/70"
      >
        <span className="max-w-[9rem] truncate">{nombre}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${abierto ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[#dbe8ee] bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.1)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf6fc] text-base font-bold text-[#00658d]">
              {iniciales}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#191c1e]">{nombre}</p>
              {email ? (
                <p className="truncate text-xs text-slate-500" title={email}>
                  {email}
                </p>
              ) : null}
              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-[#3f484e]">
                {rolLabel}
              </span>
            </div>
          </div>

          <div className="mt-3 flex justify-end border-t border-slate-100 pt-2.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAbierto(false)
                onLogout()
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

