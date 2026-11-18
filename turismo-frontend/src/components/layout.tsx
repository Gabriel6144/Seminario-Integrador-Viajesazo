import { Outlet, useLocation } from 'react-router-dom'

import { BottomNavBar } from '@/components/bottom-nav-bar'
import { TopAppBar } from '@/components/top-app-bar'

const AUTH_FULL_BLEED_PATHS = new Set(['/login', '/registro'])

/**
 * Estructura de navegación con TopAppBar (sticky) y BottomNavBar (fixed, mobile).
 *
 * En `/login` y `/registro` se renderiza solo el Outlet a pantalla completa
 * (sin chrome ni `max-w-7xl`) para el layout split de auth.
 */
export function Layout() {
  const { pathname } = useLocation()
  const isAuthFullBleed = AUTH_FULL_BLEED_PATHS.has(pathname)

  if (isAuthFullBleed) {
    return (
      <div className="min-h-screen bg-[#0f1418] text-[#191c1e]">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fb] text-[#191c1e]">
      <TopAppBar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-28 pt-6 md:pb-12">
        <Outlet />
      </main>

      <BottomNavBar />
    </div>
  )
}
