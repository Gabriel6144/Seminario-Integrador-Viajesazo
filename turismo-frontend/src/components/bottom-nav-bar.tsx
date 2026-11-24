import { NavLink } from 'react-router-dom'

import { useAuth } from '@/components/auth-provider'

/**
 * Navegación inferior fija.
 *
 * Solo visible en mobile (md:hidden). En desktop la navegación es el TopAppBar.
 * ADMIN: Dashboard + Usuarios. PUBLICADOR: Panel / Mis Propuestas / Mi agenda.
 * Guest/TURISTA: Propuestas (+ Agenda/Planificar si hay sesión).
 * TURISTA: shell turístico (sin paneles de publicador).
 */
export function BottomNavBar() {
  const { isAuthenticated, hasRole } = useAuth()
  const isAdmin = hasRole('ADMINISTRADOR')
  const isPublicador = hasRole('PUBLICADOR')

  const tabs = isAdmin
    ? [
        {
          to: '/admin',
          label: 'Dashboard',
          icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
          ),
        },
        {
          to: '/usuarios',
          label: 'Usuarios',
          icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
      ]
    : isPublicador
      ? [
          {
            to: '/publicador',
            label: 'Panel',
            icon: (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            ),
          },
          {
            to: '/propuestas',
            label: 'Mis Propuestas',
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
            to: '/publicador/agenda',
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
        ]
      : [
          ...(isAuthenticated
            ? [
                {
                  to: '/borradores',
                  label: 'Mis viajes',
                  icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden>
                      <rect x="6" y="6" width="12" height="14" rx="2" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      <line x1="10" y1="10" x2="10" y2="16" />
                      <line x1="14" y1="10" x2="14" y2="16" />
                      <line x1="8" y1="20" x2="8" y2="21.5" />
                      <line x1="16" y1="20" x2="16" y2="21.5" />
                    </svg>
                  ),
                },
              ]
            : []),
          {
            to: '/descubrir',
            label: 'Descubrir',
            icon: (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" />
              </svg>
            ),
          },
          ...(isAuthenticated
            ? [
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
                  to: '/planificar',
                  label: 'Planificar',
                  icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                    </svg>
                  ),
                },
              ]
            : []),
          ...(!isAuthenticated
            ? [
                {
                  to: '/login',
                  label: 'Ingresar',
                  icon: (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  ),
                },
              ]
            : []),
        ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 mx-4 mb-3 flex items-center justify-around rounded-2xl bg-white/90 px-2 py-2 shadow-lg backdrop-blur-md md:hidden"
      aria-label="Navegación principal"
    >
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/' || to === '/admin' || to === '/publicador'}
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
