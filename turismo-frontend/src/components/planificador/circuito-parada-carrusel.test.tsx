import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CircuitoParadaCarrusel } from './circuito-parada-carrusel'
import { user } from '@/test/utils'

describe('CircuitoParadaCarrusel', () => {
  it('oculta flechas, contador y puntitos con una sola imagen', () => {
    render(
      <CircuitoParadaCarrusel
        images={['https://example.com/a.jpg']}
        alt="Parada"
        stopNumber={1}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Foto anterior' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Foto siguiente' })).not.toBeInTheDocument()
    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument()
  })

  it('avanza, vuelve a la primera y permite ir hacia atrás', async () => {
    const usuario = user()
    render(
      <CircuitoParadaCarrusel
        images={[
          'https://example.com/a.jpg',
          'https://example.com/b.jpg',
          'https://example.com/c.jpg',
        ]}
        alt="Parada"
        stopNumber={2}
      />,
    )

    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Foto anterior' }))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })
})
