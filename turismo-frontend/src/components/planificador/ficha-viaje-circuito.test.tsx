import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FichaViajeCircuito } from './ficha-viaje-circuito'

describe('FichaViajeCircuito', () => {
  it('muestra el mes, la zona, el radio, el ritmo y los intereses del viaje', () => {
    render(
      <FichaViajeCircuito
        viaje={{
          nombre: 'Escapada serrana',
          zona: 'Villa Carlos Paz',
          fechaInicio: '2026-12-05',
          fechaFin: '2026-12-07',
          rangoInteresKm: 25,
          intereses: ['CULTURA', 'GASTRONOMIA'],
          ritmoLabel: 'Tranquilo',
        }}
      />,
    )

    const ficha = screen.getByRole('region', { name: /datos del viaje/i })
    expect(ficha).toHaveTextContent('Diciembre de 2026')
    expect(ficha).toHaveTextContent('Escapada serrana')
    expect(ficha).toHaveTextContent('Villa Carlos Paz')
    expect(ficha).toHaveTextContent('Del 5 al 7 de diciembre de 2026')
    expect(ficha).toHaveTextContent('A 25 km a la redonda')
    expect(ficha).toHaveTextContent('Tranquilo')
    expect(ficha).toHaveTextContent('Cultura')
    expect(ficha).toHaveTextContent('Gastronomía')
  })

  it('no renderiza nada sin datos', () => {
    const { container } = render(<FichaViajeCircuito viaje={{}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('tolera que falte el viaje', () => {
    const { container } = render(<FichaViajeCircuito viaje={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
