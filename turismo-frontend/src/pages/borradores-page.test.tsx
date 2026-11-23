import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { BorradoresPage } from '@/pages/borradores-page'
import { resetStore } from '@/test/store'
import { renderWithProviders, user } from '@/test/utils'

describe('BorradoresPage', () => {
  beforeEach(() => {
    resetStore()
  })

  it('lista los borradores y los circuitos ya confirmados del usuario', async () => {
    renderWithProviders(<BorradoresPage />, { authenticated: true })

    expect(await screen.findByText(/2 viajes en total/i)).toBeInTheDocument()
    expect(screen.getByText(/1 en planificación/i)).toBeInTheDocument()
    expect(screen.getByText(/1 viaje$/i)).toBeInTheDocument()
    expect(screen.getByText('Borrador de ejemplo')).toBeInTheDocument()
    expect(screen.getByText(/Falta definir dónde se alojará/i)).toBeInTheDocument()
    expect(screen.getByText('Circuito confirmado de ejemplo')).toBeInTheDocument()
    expect(screen.getByText('Planificado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver circuito/i })).toHaveAttribute(
      'href',
      '/viajes/2/circuito',
    )
  })

  it('cancela un viaje confirmado después de confirmar el diálogo', async () => {
    const usuario = user()
    renderWithProviders(<BorradoresPage />, { authenticated: true })

    await screen.findByText('Circuito confirmado de ejemplo')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar viaje' }))
    expect(await screen.findByText('¿Cancelar este viaje?')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /Sí,\s*cancelar/i }))

    await waitFor(() => {
      expect(screen.queryByText('Circuito confirmado de ejemplo')).not.toBeInTheDocument()
    })
    expect(screen.getByText(/1 viaje en total/i)).toBeInTheDocument()
    expect(screen.getByText(/1 en planificación/i)).toBeInTheDocument()
  })

  it('mantener el viaje no lo cancela', async () => {
    const usuario = user()
    renderWithProviders(<BorradoresPage />, { authenticated: true })

    await screen.findByText('Circuito confirmado de ejemplo')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar viaje' }))
    expect(await screen.findByText('¿Cancelar este viaje?')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /Mantener\s*viaje/i }))

    expect(screen.getByText('Circuito confirmado de ejemplo')).toBeInTheDocument()
  })
})
