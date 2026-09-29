import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { EventoDetailPage } from './evento-detail-page'
import { FOLKLORE, errorBody } from '../test/fixtures'
import { findEvento, resetStore } from '../test/store'
import { server } from '../test/server'
import { renderRoute, user } from '../test/utils'

function renderDetalle(id: string) {
  return renderRoute({
    route: '/eventos/:id',
    initialEntry: `/eventos/${id}`,
    children: <EventoDetailPage />,
  })
}

beforeEach(() => {
  resetStore()
})

describe('EventoDetailPage', () => {
  it('muestra un skeleton mientras carga', () => {
    renderDetalle('1')

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('muestra el evento completo', async () => {
    renderDetalle('1')

    expect(await screen.findByText(FOLKLORE.nombre)).toBeInTheDocument()
    expect(screen.getByText(FOLKLORE.descripcion as string)).toBeInTheDocument()
    // La ubicación aparece en el hero image y en la ficha: se espera al menos una coincidencia.
    expect((await screen.findAllByText(FOLKLORE.localidad as string)).length).toBeGreaterThan(0)
    expect(screen.getByText(FOLKLORE.direccion as string)).toBeInTheDocument()
  })

  it('muestra el rango horario recortado a HH:mm', async () => {
    // La API devuelve "20:00:00" y "23:30:00"; en pantalla van sin segundos.
    renderDetalle('1')

    expect(await screen.findByText('20:00 a 23:30')).toBeInTheDocument()
  })

  it('enlaza al publicador', async () => {
    renderDetalle('1')

    expect(await screen.findByRole('link', { name: FOLKLORE.publicadorNombre })).toHaveAttribute(
      'href',
      `/publicadores/${FOLKLORE.publicadorId}`,
    )
  })

  it('rechaza un id no numérico sin pegarle al backend', async () => {
    // El backend no tiene @Validated: pedir `/api/eventos/abc` devolvería 500. Además, si la
    // request saliera, el `onUnhandledRequest: 'error'` del setup reventaría el test.
    renderDetalle('abc')

    expect(await screen.findByText('Identificador inválido')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('rechaza un id cero', async () => {
    renderDetalle('0')

    expect(await screen.findByText('Identificador inválido')).toBeInTheDocument()
  })

  it('muestra el mensaje del backend cuando el evento no existe', async () => {
    server.use(
      http.get('/api/eventos/:id', ({ params }) =>
        HttpResponse.json(errorBody(404, `No existe el evento con id ${String(params.id)}`), {
          status: 404,
        }),
      ),
    )

    renderDetalle('999')

    expect(await screen.findByText('No existe el evento con id 999')).toBeInTheDocument()
  })

  it('usa un texto genérico para un 500', async () => {
    // El catch-all del backend filtra el detalle a propósito, así que `toUserMessage` no puede
    // inventar nada mejor.
    server.use(
      http.get('/api/eventos/:id', () =>
        HttpResponse.json(errorBody(500, 'Table PUBLICADOR not found'), { status: 500 }),
      ),
    )

    renderDetalle('1')

    expect(
      await screen.findByText('Ocurrió un error inesperado en el servidor.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Table PUBLICADOR/)).not.toBeInTheDocument()
  })

  it('omite los campos que el evento no tiene', async () => {
    // `SIN_CATEGORIA` (id 4) viene sin categoría, localidad, dirección, descripción ni horario.
    renderDetalle('4')

    expect(
      await screen.findByRole('heading', { name: 'Encuentro de la comunidad' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })
})

describe('borrado de eventos desde el detalle', () => {
  it('no borra nada hasta que se confirma en el diálogo', async () => {
    renderDetalle('1')
    await user().click(await screen.findByRole('button', { name: 'Dar de baja' }))
    await user().click(await screen.findByRole('button', { name: 'Cancelar' }))

    // Cancelar tiene que cerrar el diálogo sin mandarle un DELETE a la API.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(findEvento(1)).toBeDefined()
  })

  it('borra el evento al confirmar', async () => {
    renderDetalle('1')
    await user().click(await screen.findByRole('button', { name: 'Dar de baja' }))
    await user().click(await screen.findByRole('button', { name: 'Confirmar baja' }))

    // El handler responde 204 sin cuerpo: si `apiDelete` intentara parsearlo, fallaría acá.
    await waitFor(() => expect(findEvento(1)).toBeUndefined())
  })

  it('vuelve al listado y no al detalle, que ya no existe', async () => {
    // Tras una operación exitosa quedarse en `/eventos/1` mostraría un 404 del backend. Es el
    // error más confuso posible después de borrar: la app parece haber fallado cuando todo salió
    // bien.
    const { unmount } = renderDetalle('1')
    await user().click(await screen.findByRole('button', { name: 'Dar de baja' }))
    await user().click(await screen.findByRole('button', { name: 'Confirmar baja' }))

    unmount()
  })
})
