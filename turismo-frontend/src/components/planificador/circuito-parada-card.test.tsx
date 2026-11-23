import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CircuitoParadaCard } from './circuito-parada-card'
import type { ParadaCircuitoDetalle } from './types'

const baseStop: ParadaCircuitoDetalle = {
  id: '1',
  number: 2,
  time: '10:00',
  title: 'Parada de prueba',
  category: 'Cultura',
  badgeClass: 'bg-slate-700 text-white',
  description: 'Descripción',
  detailDescription: 'Detalle',
  location: 'Av. Colón 100',
  hours: '10:00 - 12:00',
  price: 'Entrada gratuita',
  image: 'https://example.com/a.jpg',
  images: ['https://example.com/a.jpg'],
  tipo: 'ACTIVIDAD',
  fecha: '2026-12-05',
  horaInicio: '10:00',
  horaFin: '12:00',
  trasladoKm: 1.2,
  trasladoMinutos: 15,
  duration: '2 h',
  latitud: -31.42,
  longitud: -64.18,
  disponible: true,
}

const previous: ParadaCircuitoDetalle = {
  ...baseStop,
  id: '0',
  number: 1,
  title: 'Anterior',
  latitud: -31.41,
  longitud: -64.17,
}

describe('CircuitoParadaCard', () => {
  it('muestra Cómo llegar desde mi ubicación en la primera parada', () => {
    render(
      <CircuitoParadaCard
        stop={{ ...baseStop, number: 1, title: 'Museo Evita' }}
        index={0}
        total={3}
        isLast={false}
        onDetails={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Punto de partida')).toBeInTheDocument()
    const link = screen.getByRole('link', {
      name: /cómo llegar a museo evita en google maps, se abre en otra pestaña/i,
    })
    expect(link).toHaveAttribute('href', expect.stringContaining('destination='))
    expect(link.getAttribute('href')).not.toContain('origin=')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.queryByText(/aprox\./)).not.toBeInTheDocument()
  })

  it('oculta Sustituir y Eliminar si no hay handlers', () => {
    render(
      <CircuitoParadaCard
        stop={baseStop}
        index={0}
        total={1}
        isLast
        onDetails={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /sustituir/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /detalles/i })).toBeInTheDocument()
  })

  it('muestra Cómo llegar desde la parada anterior con el href esperado', () => {
    render(
      <CircuitoParadaCard
        stop={baseStop}
        index={1}
        total={3}
        isLast={false}
        onDetails={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
        previousStop={previous}
      />,
    )

    const link = screen.getByRole('link', {
      name: /cómo llegar a parada de prueba en google maps, se abre en otra pestaña/i,
    })
    expect(link).toHaveTextContent(/desde la parada anterior/i)
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('origin=-31.41%2C-64.17')
    expect(href).toContain('destination=-31.42%2C-64.18')
    expect(screen.queryByText(/min a pie/)).not.toBeInTheDocument()
  })

  it('el footer solo dice Scrolleá para ver la siguiente', () => {
    render(
      <CircuitoParadaCard
        stop={baseStop}
        index={1}
        total={3}
        isLast={false}
        onDetails={vi.fn()}
        onReplace={vi.fn()}
        onDelete={vi.fn()}
        previousStop={previous}
      />,
    )
    expect(screen.getByText('Scrolleá para ver la siguiente')).toBeInTheDocument()
    expect(screen.queryByText(/min a pie/)).not.toBeInTheDocument()
  })
})
