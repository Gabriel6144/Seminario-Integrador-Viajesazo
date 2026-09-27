import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

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
    },
  })
}

/** Envoltorio mínimo: solo los providers que casi todos los tests necesitan. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const client = createTestQueryClient()
  const result: RenderResult = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
    options,
  )
  return { ...result, client }
}

/**
 * Renderiza una página como ruta del router.
 *
 * Necesario para las páginas que usan `useParams` o `useSearchParams`: sin un `<Routes>` la
 * location no tiene params y el hook devuelve `undefined`.
 *
 * @param path patrón de la ruta, con `:id` si hace falta (ej. `/eventos/:id`)
 */
export function renderRoute({
  route,
  initialEntry = '/',
  children,
}: {
  route: string
  initialEntry?: string
  children: ReactNode
}) {
  const client = createTestQueryClient()
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path={route} element={children} />
        </Routes>
      </MemoryRouter>
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
