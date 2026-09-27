import { CalendarRangeIcon, LandmarkIcon, LayoutGridIcon } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Estructura de navegación. El `Outlet` es donde se renderiza la ruta activa.
 */
const NAV_ITEMS = [
  { to: '/', label: 'Eventos', icon: LayoutGridIcon, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarRangeIcon, end: false },
  { to: '/publicadores', label: 'Publicadores', icon: LandmarkIcon, end: false },
] as const

export function Layout() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Turismo Córdoba</h1>
          <p className="text-sm text-muted-foreground">
            Agenda turística de la provincia de Córdoba
          </p>
        </div>

        <nav aria-label="Principal" className="flex flex-wrap gap-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <Button key={to} asChild variant="outline" size="sm">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => cn(isActive && 'bg-accent text-accent-foreground')}
              >
                <Icon data-icon="inline-start" aria-hidden />
                {label}
              </NavLink>
            </Button>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        <Link to="/publicadores" className="underline-offset-4 hover:underline">
          Datos de la API REST · Spring Boot
        </Link>
      </footer>
    </div>
  )
}
