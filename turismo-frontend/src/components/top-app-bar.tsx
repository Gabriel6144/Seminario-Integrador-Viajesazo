import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const CORDOBA_WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-31.4201&longitude=-64.1888&current=temperature_2m,weather_code,is_day&timezone=America%2FArgentina%2FCordoba'

interface ClimaCordoba {
  temperatura: number
  icono: string
  descripcion: string
}

function resolverIconoClima(code: number, isDay: number): { icono: string; descripcion: string } {
  const deDia = isDay === 1
  if (code === 0) {
    return {
      icono: deDia ? 'sunny' : 'clear_night',
      descripcion: 'Cielo despejado',
    }
  }
  if (code === 1 || code === 2) {
    return {
      icono: deDia ? 'partly_cloudy_day' : 'partly_cloudy_night',
      descripcion: 'Parcialmente nublado',
    }
  }
  if (code === 3) {
    return { icono: 'cloud', descripcion: 'Nublado' }
  }
  if (code === 45 || code === 48) {
    return { icono: 'foggy', descripcion: 'Neblina' }
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icono: 'rainy', descripcion: 'Lluvia' }
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { icono: 'ac_unit', descripcion: 'Nieve' }
  }
  if (code >= 95) {
    return { icono: 'thunderstorm', descripcion: 'Tormenta' }
  }
  return {
    icono: deDia ? 'partly_cloudy_day' : 'partly_cloudy_night',
    descripcion: 'Clima actual en Córdoba',
  }
}

/**
 * Header sticky con logo de VIAJESAZO y clima en tiempo real de Córdoba.
 */
export function TopAppBar() {
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
    // Refrescar cada 15 minutos
    const intervalId = window.setInterval(() => void cargarClima(), 15 * 60 * 1000)

    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-[#f7f9fb] shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2">
        {/* Logo + badge */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/LOGO_V.png"
              alt="Logo de Viajesazo"
              className="h-9 w-9 rounded-full object-cover shadow-sm"
            />
            <span className="font-heading text-lg font-bold text-[#00658d] tracking-tight">
              Viajesazo
            </span>
          </Link>
          
        </div>

       {/* Desktop nav */}
        <nav className="hidden items-center gap-2 md:flex" aria-label="Principal">
          
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white font-bold shadow-sm"
                  : "text-[#3f484e] font-medium hover:bg-slate-100 hover:text-[#00658d]"
              }`
            }
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Propuestas
          </NavLink>

          <NavLink
            to="/agenda"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white font-bold shadow-sm"
                  : "text-[#3f484e] font-medium hover:bg-slate-100 hover:text-[#00658d]"
              }`
            }
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M9 16l2 2 4-4" />
            </svg>
            Agenda
          </NavLink>

          <NavLink
            to="/planificar"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white font-bold shadow-sm"
                  : "text-[#3f484e] font-medium hover:bg-slate-100 hover:text-[#00658d]"
              }`
            }
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            Planificar
          </NavLink>

          <NavLink
            to="/publicadores"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white font-bold shadow-sm"
                  : "text-[#3f484e] font-medium hover:bg-slate-100 hover:text-[#00658d]"
              }`
            }
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
            Publicadores
          </NavLink>

          <NavLink
            to="/borradores"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white font-bold shadow-sm"
                  : "text-[#3f484e] font-medium hover:bg-slate-100 hover:text-[#00658d]"
              }`
            }
          >
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
        </nav>

        {/* Clima en vivo en Córdoba */}
        <div className="flex items-center gap-2">
          <div
            title={`${clima.descripcion} en Córdoba Capital`}
            className="flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-sky-500" aria-hidden>
              {clima.icono}
            </span>
            <span className="text-sm">{clima.temperatura}°C Córdoba</span>
          </div>
        </div>
    </div>
    </header>
  )
}
