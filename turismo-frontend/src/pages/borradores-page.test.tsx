import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BorradoresPage } from '@/pages/borradores-page'
import { renderWithProviders } from '@/test/utils'

describe('BorradoresPage', () => {
  it('lista los borradores y los circuitos ya confirmados del usuario', async () => {
    renderWithProviders(<BorradoresPage />)

    expect(await screen.findByText(/2 viajes en total/i)).toBeInTheDocument()
    expect(screen.getByText(/1 en planificación/i)).toBeInTheDocument()
    expect(screen.getByText(/1 circuito confirmado/i)).toBeInTheDocument()
    expect(screen.getByText('Borrador de ejemplo')).toBeInTheDocument()
    expect(screen.getByText('Circuito confirmado de ejemplo')).toBeInTheDocument()
    expect(screen.getByText('Circuito confirmado')).toBeInTheDocument()
  })
})
