import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PlanificadorPage } from '@/pages/planificador-page'
import { renderWithProviders } from '@/test/utils'

describe('PlanificadorPage', () => {
  it('renderiza la bienvenida (paso 1) y avanza al paso 2 al clickear Empecemos', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />)

    expect(screen.getByText('¡Córdoba te espera!')).toBeInTheDocument()
    expect(screen.getByText('Viajesazo')).toBeInTheDocument()

    const btnEmpecemos = screen.getByRole('button', { name: /empecemos/i })
    await user.click(btnEmpecemos)

    expect(
      screen.getByText(/primero, pongámosle un nombre a esta aventura/i),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Escapada a Córdoba')).toBeInTheDocument()
  })

  it('permite cambiar el nombre con las sugerencias rápidas', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />)

    await user.click(screen.getByRole('button', { name: /empecemos/i }))

    const chipAventura = screen.getByRole('button', { name: 'Aventura cordobesa' })
    await user.click(chipAventura)

    expect(screen.getByDisplayValue('Aventura cordobesa')).toBeInTheDocument()
  })

  it('permite navegar hacia atrás y abrir el modal de salida', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlanificadorPage />)

    await user.click(screen.getByRole('button', { name: /empecemos/i }))

    // Botón volver
    const btnBack = screen.getByRole('button', { name: /atrás/i })
    await user.click(btnBack)
    expect(screen.getByText('¡Córdoba te espera!')).toBeInTheDocument()

    // Botón cerrar -> modal
    const btnClose = screen.getByRole('button', { name: /cerrar/i })
    await user.click(btnClose)
    expect(screen.getByText('¿Querés guardar tu aventura? 💙')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar como borrador/i })).toBeInTheDocument()

    // Cancelar modal
    await user.click(screen.getByRole('button', { name: /seguir planificando/i }))
    expect(screen.queryByText('¿Querés guardar tu aventura? 💙')).not.toBeInTheDocument()
  })
})
