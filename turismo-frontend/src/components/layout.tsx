import { Outlet, useLocation } from 'react-router-dom'

import { BottomNavBar } from '@/components/bottom-nav-bar'
import { TopAppBar } from '@/components/top-app-bar'

const AUTH_FULL_BLEED_PATHS = new Set(['/login', '/registro'])
/** Rutas que manejan su propio ancho (sin el tope de `max-w-7xl` del layout). */
const FULL_WIDTH_PATHS = new Set(['/descubrir'])
/**
 * Detalle de evento (`/eventos/1`, no `/eventos/nuevo` ni `/eventos/1/editar`). El hero y la
 * franja de datos van a sangre, así que la página necesita el ancho completo.
 */
const EVENTO_DETAIL_PATH = /^\/eventos\/\d+$/

/**
 * Estructura de navegación con TopAppBar (sticky) y BottomNavBar (fixed, mobile).
 *
 * En `/login` y `/registro` se renderiza solo el Outlet a pantalla completa
 * (sin chrome ni `max-w-7xl`) para el layout split de auth.
 */
export function Layout() {
  const { pathname } = useLocation()
  const isAuthFullBleed = AUTH_FULL_BLEED_PATHS.has(pathname)
  const isDescubrir = FULL_WIDTH_PATHS.has(pathname)
  const isEventoDetail = EVENTO_DETAIL_PATH.test(pathname)
  const isFullWidth = isDescubrir || isEventoDetail

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

      <main
        className={
          isFullWidth
            ? `flex-1 pb-28 md:pb-12 ${isDescubrir ? 'bg-[#F7F6F2]' : 'bg-[#f7f9fb]'}`
            : 'mx-auto w-full max-w-7xl flex-1 px-5 pb-28 pt-6 md:pb-12'
        }
      >
        <Outlet />
      </main>

      <BottomNavBar />
    </div>
  )
}
