import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { useLocation } from 'react-router-dom'

import { PlanificadorPage } from '@/pages/planificador-page'
import { renderRoute, renderWithProviders } from '@/test/utils'

/** Muestra la URL actual para poder revisar los parámetros que escribe la pantalla. */
function UrlActual() {
  const location = useLocation()
  return <output data-testid="url-actual">{location.search}</output>
}

// El mapa de destino es Leaflet puro y jsdom no tiene layout: se reemplaza por un stub.
vi.mock('@/components/planificador/destino-mapa', () => ({
  DestinoMapa: () => null,
}))

vi.mock('@/components/planificador/sustitucion-mapa', () => ({
  SustitucionMapa: () => null,
}))

// El detalle recomendado monta CircuitoRutaMapa (Leaflet/MapLibre + OSRM).
vi.mock('@/components/planificador/circuito-ruta-mapa', () => ({
  CircuitoRutaMapa: ({ dayLabel }: { dayLabel: string }) => (
    <div role="img" aria-label={`Mapa del recorrido del ${dayLabel}`}>
      Mapa mock
    </div>
  ),
}))

function isoDate(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

type User = ReturnType<typeof userEvent.setup>

async function reachCircuitStep(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: /empecemos/i }))
  await user.click(screen.getByRole('button', { name: 'Aventura cordobesa' }))
  await user.click(screen.getByRole('button', { name: /continuar/i }))

  await user.type(screen.getByLabelText(/fecha de llegada/i), isoDate(30))
  await user.type(screen.getByLabelText(/fecha de partida/i), isoDate(32))
  await user.click(screen.getByRole('button', { name: /continuar/i }))

  await user.click(
    screen.getByRole('button', { name: /Villa Carlos Paz \(Valle de Punilla\)/i }),
  )
  await user.click(screen.getByRole('button', { name: /continuar/i }))

  await user.click(screen.getByRole('button', { name: /continuar/i }))
  await user.click(screen.getByRole('button', { name: /Cultura/i }))
  await user.click(screen.getByRole('button', { name: /continuar/i }))

  await user.click(screen.getByRole('button', { name: /EQUILIBRADO/i }))
  await user.click(screen.getByRole('button', { name: /continuar/i }))

  await user.click(screen.getByRole('button', { name: /generar opciones de circuitos/i }))
  // La animación dura 4 pasos x 1100 ms; el circuito llega antes y la pantalla espera a las dos.
  expect(
    await screen.findByText('Circuitos Recomendados', {}, { timeout: 8000 }),
  ).toBeInTheDocument()
}

describe('PlanificadorPage', () => {
  it('renderiza la bienvenida (paso 1) y avanza al paso 2 al clickear Empecemos', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    expect(screen.getByText('¡Córdoba te espera!')).toBeInTheDocument()

    const btnEmpecemos = screen.getByRole('button', { name: /empecemos/i })
    await user.click(btnEmpecemos)

    expect(
      screen.getByText(/primero, pongámosle un nombre a esta aventura/i),
    ).toBeInTheDocument()
    const input = screen.getByPlaceholderText(/Finde Serrano en Córdoba/i)
    expect(input).toHaveValue('')
  })

  it('permite cambiar el nombre con las sugerencias rápidas', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    await user.click(screen.getByRole('button', { name: /empecemos/i }))

    const chipAventura = screen.getByRole('button', { name: 'Aventura cordobesa' })
    await user.click(chipAventura)

    expect(screen.getByDisplayValue('Aventura cordobesa')).toBeInTheDocument()
  })

  it('bloquea el avance al paso 3 si no se ingresó un nombre de viaje y muestra advertencia', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    await user.click(screen.getByRole('button', { name: /empecemos/i }))

    const btnContinuar = screen.getByRole('button', { name: /continuar/i })
    await user.click(btnContinuar)

    // Sigue en el paso 2 y muestra toast
    expect(
      screen.getByText(/primero, pongámosle un nombre a esta aventura/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/por favor, ingresá un nombre para tu viaje/i),
    ).toBeInTheDocument()
  })

  it('avanza al paso 3 cuando se ingresa un nombre y valida las fechas', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    await user.click(screen.getByRole('button', { name: /empecemos/i }))

    // Seleccionar sugerencia rápida
    await user.click(screen.getByRole('button', { name: 'Aventura cordobesa' }))
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    // Ya estamos en el paso 3 (Fechas)
    expect(screen.getByText(/¿cuándo venís a córdoba\?/i)).toBeInTheDocument()

    // Intentar continuar sin fechas
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    expect(
      screen.getByText(/por favor, seleccioná las fechas de llegada y partida/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/¿cuándo venís a córdoba\?/i)).toBeInTheDocument()
  })

  it('rechaza fecha de llegada anterior a la fecha actual y no permite avanzar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    await user.click(screen.getByRole('button', { name: /empecemos/i }))
    await user.click(screen.getByRole('button', { name: 'Aventura cordobesa' }))
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    // Ingresar fecha en el pasado
    const inputs = screen.getAllByDisplayValue('')
    const inputLlegada = inputs[0] // fecha llegada
    const inputPartida = inputs[1] // fecha partida

    await user.type(inputLlegada, '2020-01-01')
    await user.type(inputPartida, '2020-01-05')

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(
      screen.getAllByText(/la fecha de llegada no puede ser anterior a la fecha actual/i).length,
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/¿cuándo venís a córdoba\?/i)).toBeInTheDocument()
  })

  it('permite navegar hacia atrás y abrir el modal de salida', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    await user.click(screen.getByRole('button', { name: /empecemos/i }))

    // Botón cerrar -> modal en el paso 2
    const btnClose = screen.getByRole('button', { name: /cerrar/i })
    await user.click(btnClose)
    expect(screen.getByText('¿Querés guardar tu aventura?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar como borrador/i })).toBeInTheDocument()

    // Cancelar modal
    await user.click(screen.getByRole('button', { name: /seguir planificando/i }))
    expect(screen.queryByText('¿Querés guardar tu aventura?')).not.toBeInTheDocument()

    // Botón volver
    const btnBack = screen.getByRole('button', { name: /atrás/i })
    await user.click(btnBack)
    expect(screen.getByText('¡Córdoba te espera!')).toBeInTheDocument()
  })

  it('guarda el borrador enviando la mutación al backend', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    await user.click(screen.getByRole('button', { name: /empecemos/i }))

    // Abrir modal de salida
    const btnClose = screen.getByRole('button', { name: /cerrar/i })
    await user.click(btnClose)

    const btnBorrador = screen.getByRole('button', { name: /guardar como borrador/i })
    await user.click(btnBorrador)

    expect(await screen.findByText(/borrador guardado correctamente/i)).toBeInTheDocument()
  })

  it('crea el viaje, genera el circuito y permite elegir una alternativa', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    await reachCircuitStep(user)

    expect(screen.getAllByText(/cerca de todo/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/según tus intereses/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/para descubrir/i).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: /ver detalle/i })[0])

    expect(
      (await screen.findAllByText(/circuito peatonal histórico/i)).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/semana gastronómica/i).length).toBeGreaterThan(0)
    // Antes de confirmar se puede sustituir o eliminar cada parada.
    expect(screen.getAllByRole('button', { name: /^sustituir /i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /^eliminar /i }).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /confirmar y guardar circuito/i }))

    expect(
      await screen.findByText(/circuito guardado con éxito/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver en mis viajes/i })).toBeInTheDocument()
  }, 15000)

  it('guarda en la URL el viaje, la alternativa abierta y el día', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <PlanificadorPage />
        <UrlActual />
      </>,
      { authenticated: true },
    )

    await reachCircuitStep(user)
    expect(screen.getByTestId('url-actual').textContent).toMatch(/viaje=\d+/)

    await user.click(screen.getAllByRole('button', { name: /ver detalle/i })[0])
    await screen.findByRole('button', { name: /confirmar y guardar circuito/i })
    const params = new URLSearchParams(screen.getByTestId('url-actual').textContent ?? '')
    expect(params.get('viaje')).not.toBeNull()
    expect(params.get('alternativa')).not.toBeNull()
    expect(params.get('dia')).toBe('1')

    // "Volver" desde un detalle abierto en la lista equivale al "atrás" del navegador.
    await user.click(screen.getByRole('button', { name: /volver a circuitos recomendados/i }))
    expect(await screen.findByText('Circuitos Recomendados')).toBeInTheDocument()
    expect(screen.getByTestId('url-actual').textContent).not.toMatch(/alternativa=/)
  }, 15000)

  it('al recargar (F5) en el detalle vuelve a abrir el mismo circuito', async () => {
    renderRoute({
      route: '/planificar',
      initialEntry: '/planificar?viaje=2&alternativa=INTERESES&dia=1',
      children: <PlanificadorPage />,
      authenticated: true,
    })

    expect(
      (await screen.findAllByText('Festival de Doma y Folklore de Jesús María')).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Circuito recomendado')).toBeInTheDocument()
    expect(screen.queryByText('Circuitos Recomendados')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /empecemos/i })).not.toBeInTheDocument()
  })

  it('con el circuito ya confirmado no ofrece sustituir ni eliminar en el detalle', async () => {
    renderRoute({
      route: '/planificar',
      initialEntry: '/planificar?viaje=2&alternativa=INTERESES&dia=1',
      children: <PlanificadorPage />,
      authenticated: true,
    })

    expect(
      (await screen.findAllByText('Festival de Doma y Folklore de Jesús María')).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^sustituir /i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^eliminar /i })).not.toBeInTheDocument()
  })

  it('si el viaje de la URL no existe arranca el planificador de cero', async () => {
    renderRoute({
      route: '/planificar',
      initialEntry: '/planificar?viaje=999',
      children: <PlanificadorPage />,
      authenticated: true,
    })

    expect(await screen.findByRole('button', { name: /empecemos/i })).toBeInTheDocument()
  })

  it('regenera el circuito después de confirmar el reemplazo', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />, { authenticated: true })

    await reachCircuitStep(user)

    await user.click(screen.getByRole('button', { name: /regenerar/i }))
    expect(screen.getByText(/¿Regenerar el circuito\?/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /regenerar circuito/i }))

    expect(
      await screen.findByText(/circuito regenerado correctamente/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Circuitos Recomendados')).toBeInTheDocument()
    expect(screen.queryByText(/¿Regenerar el circuito\?/i)).not.toBeInTheDocument()
  }, 15000)
})
