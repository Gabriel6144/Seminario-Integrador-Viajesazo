import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/components/auth-provider'
import { clearAccessToken, setAccessToken } from '@/lib/auth-session'
import type { UsuarioResponse } from '@/types/api'

const DEMO_TURISTA: UsuarioResponse = {
  id: 1,
  nombre: 'Turista Demo',
  email: 'turista@test.com',
  telefono: null,
  roles: ['TURISTA'],
  publicadorId: null,
}

/**
 * `QueryClient` de tests.
 *
 * Se crea uno nuevo por render y con `retry: false`: el default de TanStack Query reintenta 3
 * veces ante cualquier error, así que un test de estado de error tardaría 3 esperas y podría
 * terminar por pasarse por el reintento. `staleTime: 0` y `gcTime: 0` evitan que la caché de un
 * test leaks al siguiente.
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface ProviderOptions {
  user?: UsuarioResponse | null
  /** Sesión de turista (o el `user` pasado) sin bootstrap de red. */
  authenticated?: boolean
}

function TestAuthShell({
  children,
  user = null,
  authenticated = false,
}: {
  children: ReactNode
} & ProviderOptions) {
  const initialUser = authenticated ? (user ?? DEMO_TURISTA) : (user ?? null)
  if (initialUser !== null) {
    setAccessToken('test-access-token')
  } else {
    clearAccessToken()
  }
  return (
    <AuthProvider initialUser={initialUser} skipBootstrap>
      {children}
    </AuthProvider>
  )
}

/**
 * Por defecto: anónimo sin refresh. Pasar `{ authenticated: true }` para sesión de turista.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & ProviderOptions,
) {
  const { user, authenticated, ...renderOptions } = options ?? {}
  const client = createTestQueryClient()
  const result: RenderResult = render(
    <QueryClientProvider client={client}>
      <TestAuthShell user={user} authenticated={authenticated}>
        <MemoryRouter>{ui}</MemoryRouter>
      </TestAuthShell>
    </QueryClientProvider>,
    renderOptions,
  )
  return { ...result, client }
}

/**
 * Renderiza una página como ruta del router.
 *
 * Necesario para las páginas que usan `useParams` o `useSearchParams`: sin un `<Routes>` la
 * location no tiene params y el hook devuelve `undefined`.
 */
export function renderRoute({
  route,
  initialEntry = '/',
  children,
  user,
  authenticated,
}: {
  route: string
  initialEntry?: string
  children: ReactNode
} & ProviderOptions) {
  const client = createTestQueryClient()
  const result = render(
    <QueryClientProvider client={client}>
      <TestAuthShell user={user} authenticated={authenticated}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path={route} element={children} />
          </Routes>
        </MemoryRouter>
      </TestAuthShell>
    </QueryClientProvider>,
  )
  return { ...result, client }
}

/**
 * `userEvent` con `pointerEventsCheck` desactivado.
 *
 * shadcn usa `<Button asChild><NavLink/></Button>` y el `after:absolute` de los cards: varios
 * elementos se superponen y `userEvent` los rechaza por pointer-events salvo que se desactive el
 * check. Es un tema conocido de Radix + Testing Library, no un bug del componente.
 */
export function user() {
  return userEvent.setup({ pointerEventsCheck: 0 })
}
