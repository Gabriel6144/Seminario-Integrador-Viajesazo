import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { EventosPage } from './eventos-page'
import { EVENTOS, FOLKLORE, errorBody, page } from '../test/fixtures'
import { server } from '../test/server'
import { renderRoute, user } from '../test/utils'

import type { EventoResponse } from '@/types/api'

function renderListado(initialEntry = '/') {
  return renderRoute({ route: '/', initialEntry, children: <EventosPage /> })
}

/**
 * Handler que pagina de verdad.
 *
 * El `page` del fixture es estático: siempre devuelve `number: 0`. Sirve para estados vacío y de
 * error, pero para probar la navegación hay que cortar de verdad, si no la página 2 respondería
 * "estoy en la 0" y el botón nunca quedaría marcado.
 */
function paginaDe(eventos: EventoResponse[]) {
  return http.get('/api/eventos', ({ request }) => {
    const params = new URL(request.url).searchParams
    const size = Number(params.get('size') ?? 12)
    const number = Number(params.get('page') ?? 0)
    return HttpResponse.json(
      page(eventos.slice(number * size, number * size + size), {
        number,
        size,
        totalElements: eventos.length,
      }),
    )
  })
}

/** Registra las URLs pedidas a `/api/eventos` mientras corre el callback. */
async function captureRequests(action: () => Promise<void>): Promise<string[]> {
  const requests: string[] = []
  server.events.on('request:start', ({ request }) => {
    if (request.url.includes('/api/eventos')) requests.push(request.url)
  })
  try {
    await action()
  } finally {
    server.events.removeAllListeners()
  }
  return requests
}

describe('EventosPage', () => {
  it('muestra un skeleton mientras carga', () => {
    renderListado()

    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument()
  })

  it('lista los eventos que devuelve la API', async () => {
    renderListado()

    for (const evento of EVENTOS) {
      expect(await screen.findByRole('link', { name: evento.nombre })).toBeInTheDocument()
    }
  })

  it('muestra la ubicación en cada tarjeta', async () => {
    renderListado()

    // La ubicación aparece en el hero image y en el body de la tarjeta.
    expect((await screen.findAllByText('Jesús María')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Río Ceballos')).length).toBeGreaterThan(0)
  })

  it('muestra el rango de fechas sin corrimiento de día', async () => {
    renderListado()

    // Si `dates.ts` volviera a usar `new Date(iso)`, esto saldría "Del 30 de septiembre al 3 de
    // octubre": el corrimiento de UTC-3 es el bug que el módulo existe para evitar.
    expect(await screen.findByText('Del 1 al 4 de octubre de 2026')).toBeInTheDocument()
  })

  it('traduce la categoría al español', async () => {
    renderListado()

    expect((await screen.findAllByText('Cultura')).length).toBeGreaterThan(0)
    expect(screen.getByText('Gastronomía')).toBeInTheDocument()
  })

  it('omite el badge cuando el evento no tiene categoría', async () => {
    renderListado()

    // `SIN_CATEGORIA` llega con `categoria: null` y la tarjeta tiene que tolerarlo.
    expect(await screen.findByRole('link', { name: 'Encuentro de la comunidad' })).toBeVisible()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })

  it('muestra estado vacío en vez de error con content vacío y 200', async () => {
    // Base recién arrancada o filtro sin resultados: es una respuesta válida, no un fallo.
    server.use(paginaDe([]))

    renderListado()

    expect(await screen.findByText('Todavía no hay eventos')).toBeInTheDocument()
    expect(screen.queryByText('No se pudo cargar la información')).not.toBeInTheDocument()
  })

  it('muestra el mensaje del backend cuando la API falla', async () => {
    server.use(
      http.get('/api/eventos', () =>
        HttpResponse.json(errorBody(500, 'Ocurrió un error inesperado en el servidor.'), {
          status: 500,
        }),
      ),
    )

    renderListado()

    expect(await screen.findByText('No se pudo cargar la información')).toBeInTheDocument()
    expect(screen.getByText('Ocurrió un error inesperado en el servidor.')).toBeInTheDocument()
  })

  it('pide la página 0 con el tamaño configurado', async () => {
    const requests = await captureRequests(async () => {
      renderListado('/')
      await screen.findByRole('link', { name: FOLKLORE.nombre })
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]).toContain('page=0')
    expect(requests[0]).toContain('size=12')
  })

  it('lee la página del query param y la manda a la API', async () => {
    // El callback espera al DOM, NO a `requests`: esa `const` todavía se está inicializando
    // mientras corre el `await`, y leerla desde adentro da ReferenceError por TDZ.
    const requests = await captureRequests(async () => {
      renderListado('/?page=1')
      await screen.findByRole('link', { name: FOLKLORE.nombre })
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]).toContain('page=1')
  })

  it('ignora un page inválido en la URL y pide la primera página', async () => {
    // `?page=abc` no es un número: se trata como 0 en vez de pedir `page=NaN` al backend.
    const requests = await captureRequests(async () => {
      renderListado('/?page=abc')
      await screen.findByRole('link', { name: FOLKLORE.nombre })
    })

    expect(requests[0]).toContain('page=0')
    expect(requests[0]).not.toContain('NaN')
  })

  it('trata un page negativo como la primera página', async () => {
    const requests = await captureRequests(async () => {
      renderListado('/?page=-5')
      await screen.findByRole('link', { name: FOLKLORE.nombre })
    })

    expect(requests[0]).toContain('page=0')
  })

  it('oculta la paginación cuando todo entra en una sola página', async () => {
    renderListado()

    expect(await screen.findByText('Mostrando 1–4 de 4')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument()
  })

  it('pide la página siguiente al clickear un número', async () => {
    // 13 eventos con size 12 dan exactamente 2 páginas.
    const muchos = Array.from({ length: 13 }, (_, index) => ({
      ...FOLKLORE,
      id: index + 1,
      nombre: `Evento ${index + 1}`,
    }))
    server.use(paginaDe(muchos))

    renderListado('/')

    const paginacion = await screen.findByRole('navigation', { name: 'pagination' })
    expect(within(paginacion).getByRole('link', { current: 'page' })).toHaveTextContent('1')

    await user().click(within(paginacion).getByRole('link', { name: '2' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('2')
    })
    expect(screen.getByText('Mostrando 13–13 de 13')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Evento 13' })).toBeInTheDocument()
  })

  it('no dispara page negativo al clickear "anterior" en la primera página', async () => {
    const muchos = Array.from({ length: 13 }, (_, index) => ({
      ...FOLKLORE,
      id: index + 1,
      nombre: `Evento ${index + 1}`,
    }))
    server.use(paginaDe(muchos))

    renderListado('/')

    const paginacion = await screen.findByRole('navigation', { name: 'pagination' })

    // El listener tiene que estar puesto ANTES del clic: si se registra después no registra nada.
    // La guarda del handler es lo que evita el `page = -1`, y esto lo verifica desde la red.
    const requests = await captureRequests(async () => {
      await user().click(within(paginacion).getByLabelText('Go to previous page'))
    })

    expect(requests).toHaveLength(0)
  })
})
