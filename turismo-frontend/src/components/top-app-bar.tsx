import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '@/components/auth-provider'
import { NotificacionesBell } from '@/components/notificaciones-bell'
import { Button } from '@/components/ui/button'
import { resolverIconoClima } from '@/lib/clima'

const CORDOBA_WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-31.4201&longitude=-64.1888&current=temperature_2m,weather_code,is_day&timezone=America%2FArgentina%2FCordoba'

interface ClimaCordoba {
  temperatura: number
  icono: string
  descripcion: string
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
    isActive
      ? 'bg-gradient-to-r from-sky-600 to-sky-500 text-white font-bold shadow-sm'
      : 'text-[#3f484e] font-medium hover:bg-slate-100 hover:text-[#00658d]'
  }`

/**
 * Header sticky con logo de VIAJESAZO y clima en tiempo real de Córdoba.
 */
export function TopAppBar() {
  const { isAuthenticated, hasRole, logout, user } = useAuth()
  const navigate = useNavigate()
  const [clima, setClima] = useState<ClimaCordoba>({
    temperatura: 18,
    icono: 'partly_cloudy_day',
    descripcion: 'Clima actual en Córdoba',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function cargarClima() {
      try {
        const res = await fetch(CORDOBA_WEATHER_URL, { signal: controller.signal })
        if (!res.ok) return
        const data = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number; is_day?: number }
        }
        const temp = data.current?.temperature_2m
        if (typeof temp !== 'number') return
        const code = data.current?.weather_code ?? 1
        const isDay = data.current?.is_day ?? 1
        const { icono, descripcion } = resolverIconoClima(code, isDay)
        setClima({
          temperatura: Math.round(temp),
          icono,
          descripcion,
        })
      } catch {
        // Si no hay conexión o se aborta el fetch, se conserva el valor de respaldo (18°C).
      }
    }

    void cargarClima()
    const intervalId = window.setInterval(() => void cargarClima(), 15 * 60 * 1000)

    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-[#f7f9fb] shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2">
        <div className="flex items-center gap-2">
          <Link
            to={
              hasRole('ADMINISTRADOR') ? '/admin' : hasRole('PUBLICADOR') ? '/publicador' : '/'
            }
            className="flex items-center gap-2"
          >
            <img
              src="/LOGO_V.png"
              alt="Logo de Viajesazo"
              className="h-9 w-9 rounded-full object-cover shadow-sm"
            />
            <span className="font-heading text-lg font-bold tracking-tight text-[#bb0413]">
              Viajesazo
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Principal">
          {hasRole('ADMINISTRADOR') ? (
            <>
              <NavLink to="/admin" className={navClass}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                Dashboard
              </NavLink>
              <NavLink to="/usuarios" className={navClass}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Usuarios
              </NavLink>
            </>
          ) : hasRole('PUBLICADOR') ? (
            <>
              <NavLink to="/publicador" end className={navClass}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                Panel
              </NavLink>
              <NavLink to="/propuestas" className={navClass}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Mis Propuestas
              </NavLink>
              <NavLink to="/publicador/agenda" className={navClass}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M9 16l2 2 4-4" />
                </svg>
                Mi agenda
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/propuestas" className={navClass}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Propuestas
              </NavLink>

              {!isAuthenticated ? (
                <NavLink to="/sobre-nosotros" className={navClass}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="7" r="3" />
                    <path d="M5 21v-3a7 7 0 0 1 14 0v3Z" />
                  </svg>
                  Sobre nosotros
                </NavLink>
              ) : null}

              {isAuthenticated ? (
                <NavLink to="/agenda" className={navClass}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M9 16l2 2 4-4" />
                  </svg>
                  Agenda
                </NavLink>
              ) : null}

              {isAuthenticated ? (
                <NavLink to="/planificar" className={navClass}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                  Planificar
                </NavLink>
              ) : null}

              <NavLink to="/publicadores" className={navClass}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                </svg>
                Publicadores
              </NavLink>

              {isAuthenticated ? (
                <NavLink to="/borradores" className={navClass}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
                    <rect x="6" y="6" width="12" height="14" rx="2" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    <line x1="10" y1="10" x2="10" y2="16" />
                    <line x1="14" y1="10" x2="14" y2="16" />
                    <line x1="8" y1="20" x2="8" y2="21.5" />
                    <line x1="16" y1="20" x2="16" y2="21.5" />
                  </svg>
                  Mis viajes
                </NavLink>
              ) : null}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div
            title={`${clima.descripcion} en Córdoba Capital`}
            className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-[#bb0413] shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-[#df2a29]" aria-hidden>
              {clima.icono}
            </span>
            <span className="text-sm">{clima.temperatura}°C Córdoba</span>
          </div>

          {isAuthenticated && hasRole('TURISTA') && !hasRole('ADMINISTRADOR') && !hasRole('PUBLICADOR') ? (
            <NotificacionesBell />
          ) : null}

          {isAuthenticated ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="max-w-[10rem] truncate text-xs text-[#3f484e]" title={user?.email}>
                {user?.nombre}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => {
                  void logout().then(() => navigate('/login'))
                }}
              >
                Salir
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="hidden h-8 rounded-full bg-[#00658d] px-3 text-xs text-white hover:bg-[#65b7e8] sm:inline-flex">
              <Link to="/login">Ingresar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
