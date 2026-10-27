import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PlanificadorPage } from '@/pages/planificador-page'
import { renderWithProviders } from '@/test/utils'

// El mapa de destino es Leaflet puro y jsdom no tiene layout: se reemplaza por un stub.
vi.mock('@/components/planificador/destino-mapa', () => ({
  DestinoMapa: () => null,
}))

function isoDate(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

describe('PlanificadorPage', () => {
  it('renderiza la bienvenida (paso 1) y avanza al paso 2 al clickear Empecemos', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />)

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
    renderWithProviders(<PlanificadorPage />)

    await user.click(screen.getByRole('button', { name: /empecemos/i }))

    const chipAventura = screen.getByRole('button', { name: 'Aventura cordobesa' })
    await user.click(chipAventura)

    expect(screen.getByDisplayValue('Aventura cordobesa')).toBeInTheDocument()
  })

  it('bloquea el avance al paso 3 si no se ingresó un nombre de viaje y muestra advertencia', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />)

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
    renderWithProviders(<PlanificadorPage />)

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
    renderWithProviders(<PlanificadorPage />)

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
    renderWithProviders(<PlanificadorPage />)

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
    renderWithProviders(<PlanificadorPage />)

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
    renderWithProviders(<PlanificadorPage />)

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
    expect(screen.getAllByText(/cerca de todo/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/según tus intereses/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/para descubrir/i).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: /ver circuito/i })[0])

    expect(await screen.findByText(/circuito peatonal histórico/i)).toBeInTheDocument()
    expect(screen.getByText(/semana gastronómica/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirmar y guardar circuito/i }))

    expect(
      await screen.findByText(/circuito guardado con éxito/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver en mis viajes/i })).toBeInTheDocument()
  }, 15000)
})
