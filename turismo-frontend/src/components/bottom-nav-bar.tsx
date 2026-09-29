import { NavLink } from 'react-router-dom'

/**
 * Navegación inferior fija con 4 tabs.
 *
 * Solo visible en mobile (md:hidden). En desktop la navegación es el TopAppBar.
 * Los tabs son: Eventos, Agenda, Crear y Publicadores.
 */
const TABS = [
  {
    to: '/',
    label: 'Eventos',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/agenda',
    label: 'Agenda',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/eventos/nuevo',
    label: 'Crear',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    to: '/publicadores',
    label: 'Publicadores',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    ),
  },
] as const

export function BottomNavBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 mx-4 mb-3 flex items-center justify-around rounded-2xl bg-white/90 px-2 py-2 shadow-lg backdrop-blur-md md:hidden"
      aria-label="Navegación principal"
    >
      {TABS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            isActive
              ? 'flex flex-col items-center justify-center rounded-xl bg-[#eaf6fc] px-3 py-1.5 text-[#00658d]'
              : 'flex flex-col items-center justify-center rounded-xl px-3 py-1.5 text-[#3f484e] transition-colors hover:bg-[#e0e3e5]'
          }
        >
          {icon}
          <span className="mt-0.5 text-xs font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
