import { Link } from 'react-router-dom'

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
          <span className="hidden items-center gap-1 rounded-full bg-[#df2a29] px-2 py-0.5 text-xs font-semibold text-white sm:inline-flex">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            Verificado
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
          <Link
            to="/"
            className="flex items-center gap-1 text-sm font-semibold text-[#00658d]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Eventos
          </Link>
          <Link
            to="/agenda"
            className="text-sm text-[#3f484e] transition-colors hover:text-[#00658d]"
          >
            Agenda
          </Link>
          <Link
            to="/publicadores"
            className="text-sm text-[#3f484e] transition-colors hover:text-[#00658d]"
          >
            Publicadores
          </Link>
        </nav>

        {/* Badge publicador */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-[#e0e3e5] lg:flex">
            <svg className="h-5 w-5 text-[#00658d]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm text-[#191c1e]">Turismo Córdoba Oficial</span>
          </div>
        </div>
      </div>
    </header>
  )
}
