import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { DescubrirPage } from './descubrir-page'
import { FOLKLORE, page } from '../test/fixtures'
import { server } from '../test/server'
import { renderRoute, user } from '../test/utils'

import type { Categoria, PropuestaResumenResponse } from '@/types/api'

function renderDescubrir(initialEntry = '/descubrir', authenticated = false) {
  return renderRoute({
    route: '/descubrir',
    initialEntry,
    children: <DescubrirPage />,
    authenticated,
  })
}

/** Propuestas de prueba para la categoría pedida, con imágenes para el fondo. */
function handlerPropuestasCategoria() {
  return http.get('/api/propuestas', ({ request }) => {
    const categoria = (new URL(request.url).searchParams.get('categoria') ??
      'NATURALEZA') as Categoria
    const contenido: PropuestaResumenResponse[] = Array.from({ length: 5 }, (_, indice) => ({
      ...FOLKLORE,
      id: 100 + indice,
      nombre: `Propuesta ${indice + 1}`,
      categoria,
      tipo: 'EVENTO',
      duracionMinutos: null,
      imagenes: [`https://example.com/${categoria}-${indice}.jpg`],
    }))
    return HttpResponse.json(
      page(contenido, { number: 0, size: 100, totalElements: contenido.length }),
    )
  })
}

describe('DescubrirPage', () => {
  it('muestra el hero de la categoría inicial y hasta 3 tarjetas', async () => {
    server.use(handlerPropuestasCategoria())

    renderDescubrir()

    expect(await screen.findByRole('heading', { name: 'Naturaleza' })).toBeInTheDocument()
    expect(
      screen.getByText('Altas Cumbres · Valle de Calamuchita'),
    ).toBeInTheDocument()

    expect(await screen.findByText('Propuesta 1')).toBeInTheDocument()
    expect(screen.getByText('Propuesta 2')).toBeInTheDocument()
    expect(screen.getByText('Propuesta 3')).toBeInTheDocument()
    expect(screen.queryByText('Propuesta 4')).not.toBeInTheDocument()
  })

  it('cambia de categoría con las flechas del teclado', async () => {
    server.use(handlerPropuestasCategoria())

    renderDescubrir()
    await screen.findByText('Propuesta 1')

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(await screen.findByRole('heading', { name: 'Gastronomía' })).toBeInTheDocument()
    expect(screen.getByText('Colonia Caroya · Calamuchita · Traslasierra')).toBeInTheDocument()
  })

  it('cambia de categoría con los botones anterior y siguiente', async () => {
    server.use(handlerPropuestasCategoria())

    renderDescubrir()
    await screen.findByText('Propuesta 1')

    await user().click(screen.getByRole('button', { name: 'Categoría siguiente' }))
    expect(await screen.findByRole('heading', { name: 'Gastronomía' })).toBeInTheDocument()

    await user().click(screen.getByRole('button', { name: 'Categoría anterior' }))
    expect(await screen.findByRole('heading', { name: 'Naturaleza' })).toBeInTheDocument()
  })

  it('navega el carrusel de a una tarjeta', async () => {
    server.use(handlerPropuestasCategoria())

    renderDescubrir()
    await screen.findByText('Propuesta 1')
    expect(screen.getByText('1–3 de 5')).toBeInTheDocument()

    await user().click(screen.getByRole('button', { name: 'Tarjetas siguientes' }))

    expect(await screen.findByText('Propuesta 4')).toBeInTheDocument()
    expect(screen.getByText('2–4 de 5')).toBeInTheDocument()
    expect(screen.queryByText('Propuesta 1')).not.toBeInTheDocument()
  })

  it('lee la categoría inicial de la URL', async () => {
    server.use(handlerPropuestasCategoria())

    const pedidas: string[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname === '/api/propuestas') {
        pedidas.push(url.searchParams.get('categoria') ?? '')
      }
    })

    try {
      renderDescubrir('/descubrir?categoria=CULTURA')

      expect(await screen.findByRole('heading', { name: 'Cultura' })).toBeInTheDocument()
      await waitFor(() => expect(pedidas).toContain('CULTURA'))
    } finally {
      server.events.removeAllListeners()
    }
  })

  it('el invitado ve Entrá para guardar en las tarjetas', async () => {
    server.use(handlerPropuestasCategoria())

    renderDescubrir()
    await screen.findByText('Propuesta 1')

    const guardar = screen.getAllByRole('link', { name: 'Entrá para guardar' })
    expect(guardar).toHaveLength(3)
    expect(guardar[0]).toHaveAttribute('href', '/login')
  })

  it('el turista puede dar Me gusta y se llama a la API', async () => {
    server.use(handlerPropuestasCategoria())

    const pedidas: { path: string; method: string }[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname.endsWith('/me-gusta')) {
        pedidas.push({ path: url.pathname, method: request.method })
      }
    })

    try {
      renderDescubrir('/descubrir', true)
      await screen.findByText('Propuesta 1')

      const corazones = screen.getAllByRole('button', { name: 'Me gusta' })
      await user().click(corazones[0])

      await waitFor(() => {
        expect(pedidas).toContainEqual({
          path: '/api/propuestas/100/me-gusta',
          method: 'POST',
        })
      })
    } finally {
      server.events.removeAllListeners()
    }
  })
})
