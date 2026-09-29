import { Outlet } from 'react-router-dom'

import { BottomNavBar } from '@/components/bottom-nav-bar'
import { TopAppBar } from '@/components/top-app-bar'

/**
 * Estructura de navegación con TopAppBar (sticky) y BottomNavBar (fixed, mobile).
 *
 * El `Outlet` es donde se renderiza la ruta activa. En mobile se agrega padding
 * inferior para que el contenido no quede oculto detrás del BottomNavBar.
 */
export function Layout() {
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
