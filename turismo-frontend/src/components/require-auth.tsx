import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/components/auth-provider'
import { GridSkeleton } from '@/components/query-state'
import type { RolUsuario } from '@/types/api'

/** Exige sesión iniciada. Mientras bootstrappea muestra skeleton. */
export function RequireAuth() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return <GridSkeleton />
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <Outlet />
}

/** Exige al menos uno de los roles indicados. Va anidado bajo `RequireAuth`. */
export function RequireRole({ roles }: { roles: RolUsuario[] }) {
  const { hasRole, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <GridSkeleton />
  }

  if (!hasRole(...roles)) {
    return <Navigate to={homeForRoles(hasRole)} replace />
  }

  return <Outlet />
}

/**
 * Shell admin exclusivo: el administrador no usa catálogo/viajes en esta UI.
 * Redirige a `/admin` si el principal tiene ADMINISTRADOR.
 */
export function RequireNotAdmin() {
  const { hasRole, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <GridSkeleton />
  }

  if (hasRole('ADMINISTRADOR')) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}

/**
 * Bloquea al PUBLICADOR de las vistas turísticas (agenda provincial, planificar, mis viajes).
 */
export function RequireNotPublicadorTour() {
  const { hasRole, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <GridSkeleton />
  }

  if (hasRole('PUBLICADOR')) {
    return <Navigate to="/publicador" replace />
  }

  return <Outlet />
}

/**
 * Index `/`: admin → dashboard. PUBLICADOR y TURISTA ven el listado de propuestas
 * (el panel del publicador vive en `/publicador`).
 */
export function HomeEntry({ children }: { children: ReactNode }) {
  const { hasRole, isBootstrapping, isAuthenticated } = useAuth()

  if (isBootstrapping) {
    return <GridSkeleton />
  }

  if (isAuthenticated && hasRole('ADMINISTRADOR')) {
    return <Navigate to="/admin" replace />
  }

  return children
}

function homeForRoles(hasRole: (...roles: RolUsuario[]) => boolean): string {
  if (hasRole('ADMINISTRADOR')) return '/admin'
  if (hasRole('PUBLICADOR')) return '/publicador'
  return '/'
}
