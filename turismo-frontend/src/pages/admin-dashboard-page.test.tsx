import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AdminDashboardPage } from '@/pages/admin-dashboard-page'
import { renderWithProviders } from '@/test/utils'
import type { UsuarioResponse } from '@/types/api'

const ADMIN: UsuarioResponse = {
  id: 3,
  nombre: 'Admin Demo',
  email: 'admin@test.com',
  telefono: null,
  roles: ['ADMINISTRADOR'],
  publicadorId: null,
}

describe('AdminDashboardPage', () => {
  it('muestra métricas y ranking de propuestas populares', async () => {
    renderWithProviders(<AdminDashboardPage />, { authenticated: true, user: ADMIN })

    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard de administración de la plataforma',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Total de usuarios registrados activos')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Usuarios con actividad reciente (7 días)')).toBeInTheDocument()
    expect(screen.getByText(/Festival de Doma y Folklore de Jesús María/)).toBeInTheDocument()
    expect(
      screen.getByText('Proporción de cuentas: Publicadores frente a Turistas'),
    ).toBeInTheDocument()
  })
})
