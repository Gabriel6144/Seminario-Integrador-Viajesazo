import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PublicadorInscriptosPage } from '@/pages/publicador-inscriptos-page'
import { renderWithProviders } from '@/test/utils'
import type { UsuarioResponse } from '@/types/api'

const PUBLICADOR: UsuarioResponse = {
  id: 2,
  nombre: 'Publicador Demo',
  email: 'publicador@test.com',
  telefono: null,
  roles: ['PUBLICADOR'],
  publicadorId: 1,
}

describe('PublicadorInscriptosPage', () => {
  it('lista propuestas propias con cantidad de inscriptos', async () => {
    renderWithProviders(<PublicadorInscriptosPage />, {
      authenticated: true,
      user: PUBLICADOR,
    })

    expect(
      await screen.findByRole('heading', { name: 'Inscriptos por propuesta' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Festival de Doma y Folklore de Jesús María')).toBeInTheDocument()
    expect(screen.getByText('Semana Gastronómica de las Sierras Chicas')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Inscriptos' })).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
