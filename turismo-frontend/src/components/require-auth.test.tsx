import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { AuthProvider } from '@/components/auth-provider'
import {
  HomeEntry,
  RequireAuth,
  RequireGuest,
  RequireNotAdmin,
  RequireNotPublicadorTour,
  RequireRole,
} from '@/components/require-auth'
import { clearAccessToken, setAccessToken } from '@/lib/auth-session'
import type { UsuarioResponse } from '@/types/api'

const TURISTA: UsuarioResponse = {
  id: 1,
  nombre: 'Turista',
  email: 'turista@test.com',
  telefono: null,
  roles: ['TURISTA'],
  publicadorId: null,
}

const PUBLICADOR: UsuarioResponse = {
  id: 2,
  nombre: 'Publicador',
  email: 'publicador@test.com',
  telefono: null,
  roles: ['PUBLICADOR'],
  publicadorId: 1,
}

const ADMIN: UsuarioResponse = {
  id: 3,
  nombre: 'Admin',
  email: 'admin@test.com',
  telefono: null,
  roles: ['ADMINISTRADOR'],
  publicadorId: null,
}

function renderGuarded({
  user,
  initialEntry,
}: {
  user: UsuarioResponse | null
  initialEntry: string
}) {
  clearAccessToken()
  if (user !== null) setAccessToken('test-access-token')
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider initialUser={user} skipBootstrap>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<div>Página de login</div>} />
            <Route
              path="/"
              element={
                <HomeEntry>
                  <div>Inicio</div>
                </HomeEntry>
              }
            />
            <Route path="/propuestas" element={<div>Inicio</div>} />
            <Route element={<RequireGuest />}>
              <Route path="/sobre-nosotros" element={<div>Sobre nosotros</div>} />
            </Route>
            <Route path="/admin" element={<div>Dashboard admin</div>} />
            <Route element={<RequireNotAdmin />}>
              <Route element={<RequireNotPublicadorTour />}>
                <Route path="/agenda" element={<div>Agenda pública</div>} />
              </Route>
            </Route>
            <Route element={<RequireAuth />}>
              <Route element={<RequireNotAdmin />}>
                <Route element={<RequireNotPublicadorTour />}>
                  <Route path="/borradores" element={<div>Mis viajes protegidos</div>} />
                </Route>
              </Route>
              <Route element={<RequireRole roles={['PUBLICADOR']} />}>
                <Route path="/eventos/nuevo" element={<div>Alta de evento</div>} />
                <Route path="/publicador" element={<div>Panel publicador</div>} />
              </Route>
              <Route element={<RequireRole roles={['ADMINISTRADOR']} />}>
                <Route path="/usuarios" element={<div>Usuarios admin</div>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('RequireAuth / RequireRole', () => {
  it('redirige a login si no hay sesión', () => {
    renderGuarded({ user: null, initialEntry: '/borradores' })
    expect(screen.getByText('Página de login')).toBeInTheDocument()
  })

  it('deja pasar a una ruta autenticada', () => {
    renderGuarded({ user: TURISTA, initialEntry: '/borradores' })
    expect(screen.getByText('Mis viajes protegidos')).toBeInTheDocument()
  })

  it('bloquea alta de evento sin rol PUBLICADOR', () => {
    renderGuarded({ user: TURISTA, initialEntry: '/eventos/nuevo' })
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  it('permite alta de evento con rol PUBLICADOR', () => {
    renderGuarded({ user: PUBLICADOR, initialEntry: '/eventos/nuevo' })
    expect(screen.getByText('Alta de evento')).toBeInTheDocument()
  })

  it('redirige al admin desde index', () => {
    renderGuarded({ user: ADMIN, initialEntry: '/' })
    expect(screen.getByText('Dashboard admin')).toBeInTheDocument()
  })

  it('deja al publicador ver propuestas en index', () => {
    renderGuarded({ user: PUBLICADOR, initialEntry: '/' })
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  it('deja ver Sobre nosotros a un visitante', () => {
    renderGuarded({ user: null, initialEntry: '/sobre-nosotros' })
    expect(screen.getByText('Sobre nosotros')).toBeInTheDocument()
  })

  it('redirige Sobre nosotros al home si hay sesión', () => {
    renderGuarded({ user: TURISTA, initialEntry: '/sobre-nosotros' })
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  it('bloquea agenda turística al publicador', () => {
    renderGuarded({ user: PUBLICADOR, initialEntry: '/agenda' })
    expect(screen.getByText('Panel publicador')).toBeInTheDocument()
  })

  it('bloquea agenda al administrador', () => {
    renderGuarded({ user: ADMIN, initialEntry: '/agenda' })
    expect(screen.getByText('Dashboard admin')).toBeInTheDocument()
  })

  it('bloquea borradores al administrador', () => {
    renderGuarded({ user: ADMIN, initialEntry: '/borradores' })
    expect(screen.getByText('Dashboard admin')).toBeInTheDocument()
  })

  it('deja pasar al admin a usuarios', () => {
    renderGuarded({ user: ADMIN, initialEntry: '/usuarios' })
    expect(screen.getByText('Usuarios admin')).toBeInTheDocument()
  })

  it('bloquea usuarios al publicador', () => {
    renderGuarded({ user: PUBLICADOR, initialEntry: '/usuarios' })
    expect(screen.getByText('Panel publicador')).toBeInTheDocument()
  })

  it('permite el panel al publicador', () => {
    renderGuarded({ user: PUBLICADOR, initialEntry: '/publicador' })
    expect(screen.getByText('Panel publicador')).toBeInTheDocument()
  })

  it('bloquea el panel al turista', () => {
    renderGuarded({ user: TURISTA, initialEntry: '/publicador' })
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  it('bloquea borradores al publicador', () => {
    renderGuarded({ user: PUBLICADOR, initialEntry: '/borradores' })
    expect(screen.getByText('Panel publicador')).toBeInTheDocument()
  })
})
