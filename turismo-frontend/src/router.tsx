import { createBrowserRouter } from 'react-router-dom'

import { Layout } from '@/components/layout'
import { AgendaPage } from '@/pages/agenda-page'
import { EventoDetailPage } from '@/pages/evento-detail-page'
import { EventoEditarPage } from '@/pages/evento-editar-page'
import { EventoNuevoPage } from '@/pages/evento-nuevo-page'
import { EventosPage } from '@/pages/eventos-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { PublicadorDetailPage } from '@/pages/publicador-detail-page'
import { PublicadorNuevoPage } from '@/pages/publicador-nuevo-page'
import { PublicadoresPage } from '@/pages/publicadores-page'

/**
 * Rutas de la app.
 *
 * Todas cuelgan de `Layout`, que renderiza la navegación y el `Outlet`. React Router puntúa las
 * rutas de la más específica a la más genérica, así que el orden importa:
 *
 * - `/` tiene que ir antes que `/eventos/:id` para no quedar capturada por ella.
 * - `/eventos/nuevo` es un segmento estático contra uno dinámico. El scoring de React Router le
 *   da prioridad al estático, así que no hay colisión; y si algo fallara igual, `parseId('nuevo')`
 *   devuelve `null` y se muestra el mensaje de id inválido, no una pantalla rota.
 *
 * Las rutas se definen con `createBrowserRouter` y no `<BrowserRouter>` + `<Routes>` porque la
 * primera construye la ruta como **datos**, lo que deja `loader` y `useMatches` disponibles más
 * adelante sin tener que migrar.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: EventosPage },
      { path: 'agenda', Component: AgendaPage },
      { path: 'eventos/nuevo', Component: EventoNuevoPage },
      { path: 'eventos/:id', Component: EventoDetailPage },
      { path: 'eventos/:id/editar', Component: EventoEditarPage },
      { path: 'publicadores', Component: PublicadoresPage },
      { path: 'publicadores/nuevo', Component: PublicadorNuevoPage },
      { path: 'publicadores/:id', Component: PublicadorDetailPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
