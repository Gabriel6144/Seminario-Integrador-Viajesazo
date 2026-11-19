import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { CircuitoPage } from '@/pages/circuito-page'
import { resetStore } from '@/test/store'
import { renderRoute, user } from '@/test/utils'

describe('CircuitoPage', () => {
  beforeEach(() => {
    resetStore()
  })

  it('muestra el circuito elegido día por día e incluye los días vacíos', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    expect(
      await screen.findByText('Festival de Doma y Folklore de Jesús María'),
    ).toBeInTheDocument()
    expect(screen.getByText('Día 1')).toBeInTheDocument()
    expect(screen.getByText('Día 2')).toBeInTheDocument()
    // El detalle muestra un día a la vez; el vacío aparece al elegir el Día 2.
    await usuario.click(screen.getByRole('button', { name: /día 2/i }))
    expect(await screen.findByText('Sin actividades programadas.')).toBeInTheDocument()
    expect(screen.getByText(/Este circuito quedó desactualizado/i)).toBeInTheDocument()
    expect(screen.getByText(/fechas del viaje/i)).toBeInTheDocument()
  })

  it('regenera el circuito después de confirmar el reemplazo', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    await usuario.click(screen.getAllByRole('button', { name: /regenerar circuito/i })[0])

    expect(screen.getByText(/Se descartan las alternativas actuales/i)).toBeInTheDocument()

    const confirmar = screen.getAllByRole('button', { name: /regenerar circuito/i })
    await usuario.click(confirmar[confirmar.length - 1])

    await waitFor(() => {
      expect(
        screen.queryByText(/Se descartan las alternativas actuales/i),
      ).not.toBeInTheDocument()
    })
  })

  it('elimina una parada después de confirmar y actualiza el día', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    await usuario.click(
      screen.getByRole('button', { name: /eliminar festival de doma y folklore/i }),
    )

    expect(screen.getByText(/Se recalcularán los traslados/i)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(
        screen.queryByText('Festival de Doma y Folklore de Jesús María'),
      ).not.toBeInTheDocument()
    })
    // Tras borrar, el view-model salta al próximo día con paradas; el vacío se ve en el Día 2.
    await usuario.click(screen.getByRole('button', { name: /día 2/i }))
    expect(await screen.findByText('Sin actividades programadas.')).toBeInTheDocument()
  })

  it('conserva la parada si se cancela la eliminación', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    await usuario.click(
      screen.getByRole('button', { name: /eliminar festival de doma y folklore/i }),
    )
    await usuario.click(screen.getByRole('button', { name: /cancelar/i }))

    await waitFor(() => {
      expect(screen.queryByText(/Se recalcularán los traslados/i)).not.toBeInTheDocument()
    })
    expect(screen.getByText('Festival de Doma y Folklore de Jesús María')).toBeInTheDocument()
  })

  it('reemplaza una parada con una alternativa compatible', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    await usuario.click(
      screen.getByRole('button', { name: /sustituir festival de doma y folklore/i }),
    )

    expect(await screen.findByText('Sustituir parada')).toBeInTheDocument()
    await usuario.click(await screen.findByRole('button', { name: /Feria de Artesanos/i }))
    await usuario.click(screen.getByRole('button', { name: 'Reemplazar' }))

    await waitFor(() => {
      expect(
        screen.queryByText('Festival de Doma y Folklore de Jesús María'),
      ).not.toBeInTheDocument()
    })
    expect(screen.getByText('Feria de Artesanos')).toBeInTheDocument()
  })

  it('explica cuando no hay alternativas para sustituir la parada', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    // Peatonal está en el Día 3 del viaje 2.
    await usuario.click(screen.getByRole('button', { name: /día 3/i }))
    expect(
      await screen.findByText('Circuito Peatonal Histórico Córdoba Jesuítica'),
    ).toBeInTheDocument()
    await usuario.click(
      screen.getByRole('button', { name: /sustituir circuito peatonal histórico/i }),
    )

    expect(
      await screen.findByText('No hay propuestas disponibles para reemplazar esta parada.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeDisabled()
  })

  it('conserva la parada si se cancela el reemplazo', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    await usuario.click(
      screen.getByRole('button', { name: /sustituir festival de doma y folklore/i }),
    )
    await screen.findByRole('button', { name: /Feria de Artesanos/i })
    await usuario.click(screen.getByRole('button', { name: /cancelar/i }))

    await waitFor(() => {
      expect(screen.queryByText('Sustituir parada')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Festival de Doma y Folklore de Jesús María')).toBeInTheDocument()
  })

  it('muestra un error cuando el viaje no tiene circuito seleccionado', async () => {
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/1/circuito',
      children: <CircuitoPage />,
    })

    expect(await screen.findByText(/No se pudo cargar la información/i)).toBeInTheDocument()
  })
})
