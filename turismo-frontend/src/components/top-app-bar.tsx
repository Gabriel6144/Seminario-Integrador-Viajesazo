import { Link } from 'react-router-dom'
import { NavLink } from 'react-router-dom';

/**
 * Header sticky con logo de VIAJESAZO y badge de verificado.
 *
 * En mobile muestra solo el logo y el badge. En desktop (md+) agrega los links de
 * navegación: Eventos, Agenda, Estadísticas y Configuración.
 */
export function TopAppBar() {
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
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Eventos
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
            <span className="material-symbols-outlined text-[16px]">explore</span>
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
            Publicadores
          </NavLink>

        </nav>

        {/* Badge publicador */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold flex items-center gap-1 border border-sky-100 shadow-sm">
          <span className="material-symbols-outlined text-sm text-sky-500">partly_cloudy_day</span>
          <span className="text-sm">18°C Córdoba</span>
        </div>
      </div>
    </div>
    </header>
  )
}
