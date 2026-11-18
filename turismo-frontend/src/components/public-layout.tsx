import { Outlet } from 'react-router-dom'

import { BottomNavBar } from '@/components/bottom-nav-bar'
import { TopAppBar } from '@/components/top-app-bar'

/**
 * Layout de las vistas públicas (Inicio y Sobre nosotros).
 *
 * Reutiliza el encabezado (logo y clima) y la navegación móvil de la app, pero **no**
 * envuelve el contenido en `<main>`: las páginas públicas ya traen su propio `<main>`.
 * El padding inferior evita que el footer editorial quede debajo del BottomNavBar.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fb] text-[#191c1e]">
      <TopAppBar />

      <div className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </div>

      <BottomNavBar />
    </div>
  )
}
