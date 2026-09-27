import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { PublicadoresPage } from './publicadores-page'
import { PUBLICADORES, TURISMO, page } from '../test/fixtures'
import { server } from '../test/server'
import { renderRoute } from '../test/utils'

function renderPublicadores(initialEntry = '/publicadores') {
  return renderRoute({
    route: '/publicadores',
    initialEntry,
    children: <PublicadoresPage />,
  })
}

describe('PublicadoresPage', () => {
  it('muestra un skeleton mientras carga', () => {
    renderPublicadores()

    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument()
  })

  it('NO muestra el estado vacío mientras carga', () => {
    // Regresión: durante `isPending` `data` es `undefined`, así que una condición tipo
    // `data?.content.length === 0` pintaba "No hay publicadores" encima del skeleton.
    renderPublicadores()

    expect(screen.queryByText('No hay publicadores cargados')).not.toBeInTheDocument()
  })

  it('lista los publicadores que devuelve la API', async () => {
    renderPublicadores()

    for (const publicador of PUBLICADORES) {
      expect(await screen.findByRole('link', { name: publicador.nombre })).toBeInTheDocument()
    }
  })

  it('enlaza cada tarjeta a su detalle', async () => {
    renderPublicadores()

    expect(await screen.findByRole('link', { name: TURISMO.nombre })).toHaveAttribute(
      'href',
      `/publicadores/${TURISMO.id}`,
    )
  })

  it('muestra el teléfono, o avisa que no hay', async () => {
    renderPublicadores()

    expect(await screen.findByText(TURISMO.telefono as string)).toBeInTheDocument()
    // `ARTESANOS.telefono` es null en el fixture.
    expect(screen.getAllByText('Sin teléfono').length).toBeGreaterThan(0)
  })

  it('muestra estado vacío con content vacío y 200', async () => {
    server.use(http.get('/api/publicadores', () => HttpResponse.json(page([]))))

    renderPublicadores()

    expect(await screen.findByText('No hay publicadores cargados')).toBeInTheDocument()
  })

  it('no deja el estado vacío pegado cuando la lista viene vacía de verdad', async () => {
    server.use(http.get('/api/publicadores', () => HttpResponse.json(page([], { totalElements: 0 }))))

    renderPublicadores()

    expect(await screen.findByText('No hay publicadores cargados')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Cargando' })).not.toBeInTheDocument()
  })
})
