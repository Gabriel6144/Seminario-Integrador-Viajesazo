import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CircuitoPage } from '@/pages/circuito-page'
import { createCircuito, resetStore, setSugerenciasVacias } from '@/test/store'
import { server } from '@/test/server'
import { renderRoute, user } from '@/test/utils'

// El mapa del panel Sustituir también es Leaflet: en jsdom no hay layout.
vi.mock('@/components/planificador/sustitucion-mapa', () => ({
  SustitucionMapa: () => <div role="img" aria-label="Mapa de opciones">Mapa mock</div>,
}))

vi.mock('@/components/planificador/circuito-ruta-mapa', () => ({
  CircuitoRutaMapa: ({ dayLabel }: { dayLabel: string }) => (
    <div role="img" aria-label={`Mapa del recorrido del ${dayLabel}`}>
      Mapa mock
    </div>
  ),
}))

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
    // Tabs con formatWeekdayDay: 5–7 dic 2026 → Sábado/Domingo/Lunes.
    expect(screen.getByRole('button', { name: /sábado 5/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /domingo 6/i })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /domingo 6/i }))
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
    // El día elegido vive en la URL: después de borrar la vista se queda en el mismo día.
    await usuario.click(screen.getByRole('button', { name: /domingo 6/i }))
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
    await usuario.click(screen.getByRole('button', { name: /sustituir por a/i }))

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
    // Peatonal está el lunes 7 (día 3 del viaje 2).
    await usuario.click(screen.getByRole('button', { name: /lunes 7/i }))
    expect(
      await screen.findByText('Circuito Peatonal Histórico Córdoba Jesuítica'),
    ).toBeInTheDocument()
    await usuario.click(
      screen.getByRole('button', { name: /sustituir circuito peatonal histórico/i }),
    )

    expect(
      await screen.findByText('No hay propuestas disponibles para reemplazar esta parada.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sustituir$/i })).toBeDisabled()
  })

  it('el panel de sustituir explica el orden, filtra y muestra lo que no entra', async () => {
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

    const dialogo = await screen.findByRole('dialog', { name: 'Sustituir parada' })
    expect(within(dialogo).getByText(/Cómo las ordenamos/i)).toBeInTheDocument()
    expect(within(dialogo).getByText(/Tu hueco libre: 06:00 – 23:59/i)).toBeInTheDocument()
    // La mejor recomendación (la que le gustó) arranca elegida.
    const feria = await within(dialogo).findByRole('button', { name: /A\. Feria de Artesanos/i })
    expect(feria).toHaveAttribute('aria-pressed', 'true')
    expect(within(feria).getByText('Le diste Me gusta')).toBeInTheDocument()
    const bici = within(dialogo).getByRole('button', { name: /B\. Bicicleteada/i })
    expect(within(bici).getByText('Fuera de tus preferencias')).toBeInTheDocument()

    // Filtro "Te gustaron": queda solo la feria.
    await usuario.click(within(dialogo).getByRole('button', { name: /te gustaron \(1\)/i }))
    expect(within(dialogo).queryByRole('button', { name: /B\. Bicicleteada/i })).not.toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: /otras categorías \(1\)/i }))
    expect(within(dialogo).getByRole('button', { name: /B\. Bicicleteada/i })).toBeInTheDocument()

    // Elegir otra opción cambia el botón de confirmar.
    await usuario.click(within(dialogo).getByRole('button', { name: /B\. Bicicleteada/i }))
    expect(within(dialogo).getByRole('button', { name: /sustituir por b/i })).toBeEnabled()

    expect(within(dialogo).getByText(/No entran ese día \(1\)/i)).toBeInTheDocument()
    expect(within(dialogo).getByText(/Queda a 38,0 km de tu zona/i)).toBeInTheDocument()
  })

  it('eliminar cuenta cómo queda el día y avisa la inscripción', async () => {
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

    const dialogo = await screen.findByRole('alertdialog', { name: 'Eliminar parada' })
    expect(within(dialogo).getByText(/El día va a quedar/i)).toBeInTheDocument()
    expect(
      within(dialogo).getByText('Dejás de figurar como inscripto en esta propuesta.'),
    ).toBeInTheDocument()
  })

  it('no se rompe si el backend todavía responde con el formato viejo', async () => {
    server.use(
      http.get('/api/viajes/:id/circuito/seleccionado/items/:itemId/alternativas', () =>
        HttpResponse.json({ alternativas: [], mensaje: null }),
      ),
    )
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

    expect(await screen.findByText(/reiniciá el backend/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sustituir$/i })).toBeDisabled()
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

  it('al recargar (F5) vuelve al mismo día del circuito confirmado', async () => {
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito?dia=2',
      children: <CircuitoPage />,
    })

    expect(await screen.findByText('Sin actividades programadas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /domingo 6/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('al recargar (F5) vuelve al detalle de la alternativa que se estaba viendo', async () => {
    const usuario = user()
    createCircuito(1)
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/1/circuito?alternativa=CERCANIA&dia=2',
      children: <CircuitoPage />,
    })

    expect(
      await screen.findByRole('button', { name: /confirmar y guardar circuito/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Circuitos Recomendados')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lunes 2/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // Sin historial previo, "Volver" saca el detalle de la URL y muestra la lista.
    await usuario.click(screen.getByRole('button', { name: /volver a circuitos recomendados/i }))
    expect(await screen.findByText('Circuitos Recomendados')).toBeInTheDocument()
  })

  it('antes de confirmar elimina una parada de la alternativa recomendada', async () => {
    const usuario = user()
    createCircuito(1)
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/1/circuito?alternativa=CERCANIA&dia=1',
      children: <CircuitoPage />,
    })

    await screen.findByRole('button', { name: /confirmar y guardar circuito/i })
    const botones = screen.getAllByRole('button', { name: /^eliminar /i })
    const cantidad = botones.length
    expect(cantidad).toBeGreaterThan(1)

    await usuario.click(botones[0])
    expect(screen.getByText(/Se recalcularán los traslados/i)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^eliminar /i })).toHaveLength(cantidad - 1)
    })
    // Sigue en el mismo detalle (no vuelve a la lista de recomendados).
    expect(screen.getByRole('button', { name: /confirmar y guardar circuito/i })).toBeInTheDocument()
  })

  it('antes de confirmar sustituye una parada de la alternativa recomendada', async () => {
    const usuario = user()
    createCircuito(1)
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/1/circuito?alternativa=CERCANIA&dia=1',
      children: <CircuitoPage />,
    })

    await screen.findByRole('button', { name: /confirmar y guardar circuito/i })
    await usuario.click(screen.getAllByRole('button', { name: /^sustituir /i })[0])

    expect(await screen.findByText('Sustituir parada')).toBeInTheDocument()
    await usuario.click(await screen.findByRole('button', { name: /Feria de Artesanos/i }))
    await usuario.click(screen.getByRole('button', { name: /sustituir por a/i }))

    expect(
      await screen.findByRole('button', { name: /sustituir feria de artesanos/i }),
    ).toBeInTheDocument()
  })

  it('antes de confirmar completa con sugerencias un día que quedó incompleto', async () => {
    const usuario = user()
    createCircuito(1)
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/1/circuito?alternativa=CERCANIA&dia=1',
      children: <CircuitoPage />,
    })

    await screen.findByRole('button', { name: /confirmar y guardar circuito/i })
    // Con las 4 paradas del ritmo Equilibrado el día está completo: no hay aviso.
    expect(
      screen.queryByRole('button', { name: /ver sugerencias para completar/i }),
    ).not.toBeInTheDocument()

    // Al sacar una parada el día queda incompleto y se puede completar sin confirmar antes.
    await usuario.click(screen.getAllByRole('button', { name: /^eliminar /i })[0])
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(
      await screen.findByText(/Se asignaron 3 de 4 paradas pedidas para este día/i),
    ).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /ver sugerencias para completar/i }))
    expect(await screen.findByText('Completar el día')).toBeInTheDocument()
    expect(await screen.findByText('Caminata al mirador')).toBeInTheDocument()
    await usuario.click(screen.getAllByRole('button', { name: 'Agregar' })[0])

    expect(await screen.findByText('Completaste este día con sugerencias')).toBeInTheDocument()
    // El diálogo queda abierto para sumar más; se cierra a mano.
    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(
      screen.queryByRole('button', { name: /ver sugerencias para completar/i }),
    ).not.toBeInTheDocument()
    // Sigue en el detalle de la alternativa, todavía sin confirmar.
    expect(screen.getByRole('button', { name: /confirmar y guardar circuito/i })).toBeInTheDocument()
  })

  it('antes de confirmar "Dejarlo así" oculta el aviso del día', async () => {
    const usuario = user()
    createCircuito(1)
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/1/circuito?alternativa=CERCANIA&dia=1',
      children: <CircuitoPage />,
    })

    await screen.findByRole('button', { name: /confirmar y guardar circuito/i })
    await usuario.click(screen.getAllByRole('button', { name: /^eliminar /i })[0])
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await usuario.click(await screen.findByRole('button', { name: /dejarlo así/i }))

    expect(screen.queryByText(/Se asignaron 3 de 4/i)).not.toBeInTheDocument()
  })

  it('muestra un error cuando el viaje no tiene circuito seleccionado', async () => {
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/1/circuito',
      children: <CircuitoPage />,
    })

    expect(await screen.findByText(/No se pudo cargar la información/i)).toBeInTheDocument()
  })

  it('abre sugerencias, agrega una parada y muestra el badge', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    expect(
      screen.getByText(/Se asignaron 1 de 2 paradas pedidas para este día/i),
    ).toBeInTheDocument()

    await usuario.click(
      screen.getByRole('button', { name: /Ver sugerencias para completar/i }),
    )
    expect(await screen.findByText('Completar el día')).toBeInTheDocument()
    expect(await screen.findByText('Caminata al mirador')).toBeInTheDocument()
    expect(screen.getByText('Feria de Artesanos')).toBeInTheDocument()

    // OTRO_TIPO va primero en el diálogo → Caminata al mirador.
    await usuario.click(screen.getAllByRole('button', { name: 'Agregar' })[0])

    await waitFor(() => {
      expect(screen.getByText('Agregada por vos')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Ver sugerencias para completar/i }),
      ).not.toBeInTheDocument()
    })
  })

  it('muestra el mensaje cuando no hay sugerencias', async () => {
    setSugerenciasVacias(true)
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    await usuario.click(
      screen.getByRole('button', { name: /Ver sugerencias para completar/i }),
    )
    expect(
      await screen.findByText('No encontramos propuestas para completar este día'),
    ).toBeInTheDocument()
  })

  it('oculta el aviso al elegir Dejarlo así', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    expect(
      screen.getByRole('button', { name: /Ver sugerencias para completar/i }),
    ).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /Dejarlo así/i }))

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Ver sugerencias para completar/i }),
      ).not.toBeInTheDocument()
    })
  })

  it('muestra error 422 si la sugerencia deja de ser válida', async () => {
    const usuario = user()
    renderRoute({
      route: '/viajes/:id/circuito',
      initialEntry: '/viajes/2/circuito',
      children: <CircuitoPage />,
    })

    await screen.findByText('Festival de Doma y Folklore de Jesús María')
    await usuario.click(
      screen.getByRole('button', { name: /Ver sugerencias para completar/i }),
    )
    await screen.findByText('Feria de Artesanos')
    setSugerenciasVacias(true)
    await usuario.click(screen.getAllByRole('button', { name: 'Agregar' })[0])

    expect(
      await screen.findByText(/ya no es una sugerencia válida/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Agregada por vos')).not.toBeInTheDocument()
  })
})
