import { createBrowserRouter } from 'react-router-dom'

import { Layout } from '@/components/layout'
import { PublicLayout } from '@/components/public-layout'
import {
  RequireAuth,
  RequireGuest,
  RequireNotAdmin,
  RequireNotPublicadorTour,
  RequireRole,
} from '@/components/require-auth'
import { ActividadDetailPage } from '@/pages/actividad-detail-page'
import { ActividadEditarPage } from '@/pages/actividad-editar-page'
import { AdminDashboardPage } from '@/pages/admin-dashboard-page'
import { AgendaPage } from '@/pages/agenda-page'
import { BorradoresPage } from '@/pages/borradores-page'
import { CircuitoPage } from '@/pages/circuito-page'
import { EventoDetailPage } from '@/pages/evento-detail-page'
import { EventoEditarPage } from '@/pages/evento-editar-page'
import { EventoNuevoPage } from '@/pages/evento-nuevo-page'
import { EventosPage } from '@/pages/eventos-page'
import { LoginPage } from '@/pages/login-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { PlanificadorPage } from '@/pages/planificador-page'
import { PublicadorAgendaPage } from '@/pages/publicador-agenda-page'
import { PublicadorDashboardPage } from '@/pages/publicador-dashboard-page'
import { PublicadorNuevoPage } from '@/pages/publicador-nuevo-page'
import { RegistroPage } from '@/pages/registro-page'
import { UsuarioNuevoPage } from '@/pages/usuario-nuevo-page'
import { UsuariosPage } from '@/pages/usuarios-page'

/**
 * Rutas de la app.
 *
 * - Público: `/` (Inicio) y `/sobre-nosotros` con layout sin `<main>` propio.
 * - ADMINISTRADOR: `/admin` + `/usuarios` (+ alta publicador).
 * - PUBLICADOR: Mis propuestas (`/propuestas`) + panel/agenda.
 * - TURISTA / guest: catálogo en `/descubrir`; turista además planificar + mis viajes + agenda.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      {
        Component: PublicLayout,
        children: [
          {
            index: true,
            lazy: async () => {
              const { InicioPage } = await import('@/pages/inicio-page')
              return { Component: InicioPage }
            },
          },
          {
            Component: RequireGuest,
            children: [
              {
                path: 'sobre-nosotros',
                lazy: async () => {
                  const { SobreNosotrosPage } = await import(
                    '@/pages/sobre-nosotros-page'
                  )
                  return { Component: SobreNosotrosPage }
                },
              },
            ],
          },
        ],
      },
      {
        Component: Layout,
        children: [
          { path: 'login', Component: LoginPage },
          { path: 'registro', Component: RegistroPage },

          {
            Component: RequireNotAdmin,
            children: [
              { path: 'eventos/:id', Component: EventoDetailPage },
              { path: 'actividades/:id', Component: ActividadDetailPage },
              {
                Component: RequireNotPublicadorTour,
                children: [
                  {
                    path: 'descubrir',
                    lazy: async () => {
                      const { DescubrirPage } = await import('@/pages/descubrir-page')
                      return { Component: DescubrirPage }
                    },
                  },
                ],
              },
            ],
          },

          {
            Component: RequireAuth,
            children: [
              {
                Component: RequireNotAdmin,
                children: [
                  {
                    Component: RequireNotPublicadorTour,
                    children: [
                      { path: 'agenda', Component: AgendaPage },
                      { path: 'borradores', Component: BorradoresPage },
                      { path: 'planificar', Component: PlanificadorPage },
                      { path: 'viajes/:id/circuito', Component: CircuitoPage },
                    ],
                  },
                  {
                    element: <RequireRole roles={['PUBLICADOR']} />,
                    children: [
                      { path: 'publicador', Component: PublicadorDashboardPage },
                      {
                        path: 'publicador/agenda',
                        Component: PublicadorAgendaPage,
                      },
                      { path: 'propuestas', Component: EventosPage },
                      { path: 'propuestas/nueva', Component: EventoNuevoPage },
                      { path: 'eventos/nuevo', Component: EventoNuevoPage },
                      { path: 'eventos/:id/editar', Component: EventoEditarPage },
                      {
                        path: 'actividades/:id/editar',
                        Component: ActividadEditarPage,
                      },
                    ],
                  },
                ],
              },
              {
                element: <RequireRole roles={['ADMINISTRADOR']} />,
                children: [
                  { path: 'admin', Component: AdminDashboardPage },
                  { path: 'publicadores/nuevo', Component: PublicadorNuevoPage },
                  { path: 'usuarios', Component: UsuariosPage },
                  { path: 'usuarios/nuevo', Component: UsuarioNuevoPage },
                ],
              },
            ],
          },

          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
])
