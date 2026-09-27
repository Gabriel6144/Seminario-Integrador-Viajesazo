import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import './index.css'
import { Toaster } from '@/components/ui/sonner'
import { ApiError } from '@/lib/http'
import { router } from '@/router'

/**
 * El `QueryClient` se crea a nivel de módulo, no dentro de un componente.
 *
 * Si estuviera en el cuerpo de un componente, cada render crearía un cliente nuevo y con él una
 * caché nueva: cada navegación a otra ruta perdería los datos ya traídos y volvería a pedir todo.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Un minuto: el catálogo cambia poco y evita re-fetch al saltar entre detalle y listado.
      staleTime: 60_000,
      // Un 4xx no mejora reintentando: son IDs inexistentes o emails duplicados, no una caída
      // transitoria. Un 5xx o un error de red sí se reintenta una vez.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 1
      },
    },
  },
})

const root = document.getElementById('root')

if (root === null) throw new Error('Falta el nodo #root en index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/*
        Va acá y no dentro de `Layout` para que los toasts sobrevivan a la navegación: si estuviera
        en el layout se desmontarían con la ruta. El `Toaster` de shadcn lee el tema de
        `next-themes`, que en esta app no tiene `ThemeProvider` y por lo tanto devuelve `"system"`,
        que sin la clase `.dark` aplicada resuelve a claro.
      */}
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  </StrictMode>,
)
