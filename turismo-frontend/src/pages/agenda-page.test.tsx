import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { AgendaPage } from './agenda-page'
import { ARTESANIAS, FOLKLORE, GASTRONOMIA_ESTANCIA, SIN_CATEGORIA, page } from '@/test/fixtures'
import { server } from '@/test/server'
import { resetStore } from '@/test/store'
import { renderRoute, user } from '@/test/utils'

function renderAgenda(initialEntry = '/agenda') {
  return renderRoute({
    route: '/agenda',
    initialEntry,
    children: <AgendaPage />,
  })
}

beforeEach(() => {
  resetStore()
})

describe('AgendaPage', () => {
  it('CA1: muestra los eventos ordenados por fecha mostrando los más próximos primero', async () => {
    // El backend simulado devuelve los eventos desordenados a propósito para verificar que la
    // agenda siempre los ordene de más próximo a más lejano.
    server.use(
      http.get('/api/agenda/semanal', () =>
        HttpResponse.json(
          page([SIN_CATEGORIA, GASTRONOMIA_ESTANCIA, FOLKLORE, ARTESANIAS]),
        ),
      ),
    )

    renderAgenda()

    const headings = await screen.findAllByRole('heading', { level: 3 })
    const nombres = headings.map((h) => h.textContent)

    expect(nombres).toEqual([
      FOLKLORE.nombre, // 2026-10-01
      ARTESANIAS.nombre, // 2026-10-03
      GASTRONOMIA_ESTANCIA.nombre, // 2026-10-05
      SIN_CATEGORIA.nombre, // 2026-10-07
    ])
  })

  it('CA2: abre el panel lateral (Drawer) al hacer clic y permite filtrar con chips interactivos por ubicación, acceso, tipo y fechas', async () => {
    server.use(
      http.get('/api/agenda/semanal', () =>
        HttpResponse.json(
          page([
            { ...FOLKLORE, tipoPropuesta: 'FESTIVAL' },
            { ...ARTESANIAS, tipoPropuesta: 'FERIA' },
            { ...GASTRONOMIA_ESTANCIA, tipoPropuesta: 'VISITA_GUIADA' },
          ]),
        ),
      ),
    )

    renderAgenda()

    expect(await screen.findByRole('link', { name: FOLKLORE.nombre })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: ARTESANIAS.nombre })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: GASTRONOMIA_ESTANCIA.nombre })).toBeInTheDocument()

    // El drawer arranca cerrado
    expect(screen.queryByRole('dialog', { name: 'Filtros de la agenda' })).not.toBeInTheDocument()

    // Abrir el drawer lateral
    await user().click(screen.getByRole('button', { name: /Filtrar eventos/i }))
    expect(screen.getByRole('dialog', { name: 'Filtros de la agenda' })).toBeInTheDocument()

    // Filtrar por ubicación (sin tilde ni mayúsculas)
    await user().type(screen.getByLabelText(/Ubicación/i), 'jesus maria')
    expect(screen.getByRole('link', { name: FOLKLORE.nombre })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: ARTESANIAS.nombre })).not.toBeInTheDocument()

    // Limpiar filtros restaura todos los eventos
    await user().click(screen.getAllByRole('button', { name: /Limpiar filtros/i })[0])
    expect(await screen.findByRole('link', { name: ARTESANIAS.nombre })).toBeInTheDocument()

    // Filtrar con el chip de acceso Arancelado
    await user().click(screen.getByRole('button', { name: 'Arancelado' }))
    expect(screen.getByRole('link', { name: GASTRONOMIA_ESTANCIA.nombre })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: FOLKLORE.nombre })).not.toBeInTheDocument()

    // Limpiar filtros y filtrar con el chip de Tipo de propuesta (Feria)
    await user().click(screen.getAllByRole('button', { name: /Limpiar filtros/i })[0])
    await user().click(screen.getByRole('button', { name: 'Feria' }))
    expect(screen.getByRole('link', { name: ARTESANIAS.nombre })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: FOLKLORE.nombre })).not.toBeInTheDocument()

    // Limpiar filtros y filtrar por rango de fechas (desde 2026-10-05)
    await user().click(screen.getAllByRole('button', { name: /Limpiar filtros/i })[0])
    await user().type(screen.getByLabelText(/Fecha desde/i), '2026-10-05')
    expect(screen.getByRole('link', { name: ARTESANIAS.nombre })).toBeInTheDocument() // termina el 2026-10-06
    expect(screen.getByRole('link', { name: GASTRONOMIA_ESTANCIA.nombre })).toBeInTheDocument() // 2026-10-05
    expect(screen.queryByRole('link', { name: FOLKLORE.nombre })).not.toBeInTheDocument() // terminó el 2026-10-04
  }, 15_000)

  it('CA3: permite seleccionar un evento para consultar su información en detalle', async () => {
    renderAgenda()

    const linkEvento = await screen.findByRole('link', { name: FOLKLORE.nombre })
    expect(linkEvento).toHaveAttribute('href', `/eventos/${FOLKLORE.id}`)
  })
})
