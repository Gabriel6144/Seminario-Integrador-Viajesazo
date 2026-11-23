import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { toCircuitoRecomendado } from './circuito-view-model'
import { CircuitoDiaSplitView } from './circuito-dia-split-view'
import { CIRCUITO } from '@/test/fixtures'
import { user } from '@/test/utils'

vi.mock('./circuito-ruta-mapa', () => ({
  CircuitoRutaMapa: ({ dayLabel }: { dayLabel: string }) => (
    <div>
      <div role="img" aria-label={`Mapa del recorrido del ${dayLabel}`}>
        Mapa mock
      </div>
      <a href="https://www.google.com/maps/dir/?api=1&destination=-31.42%2C-64.18">
        Ver el día en Google Maps
      </a>
    </div>
  ),
}))

function renderSplit(overrides?: {
  onReplace?: (stop: unknown) => void
  onDelete?: (stop: unknown) => void
  activeDay?: number
  onChangeActiveDay?: (day: number) => void
}) {
  const circuito = toCircuitoRecomendado(CIRCUITO.alternativas[0], 'Equilibrado')
  const onReplace = overrides?.onReplace ?? vi.fn()
  const onDelete = overrides?.onDelete ?? vi.fn()
  const onChangeActiveDay = overrides?.onChangeActiveDay ?? vi.fn()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <CircuitoDiaSplitView
        circuito={circuito}
        activeDay={overrides?.activeDay ?? 1}
        onChangeActiveDay={onChangeActiveDay}
        onBackToList={vi.fn()}
        onExploreMap={vi.fn()}
        onReplaceStop={onReplace as never}
        onDeleteStop={onDelete as never}
        viajeId={2}
      />
    </QueryClientProvider>,
  )

  return { onReplace, onDelete, onChangeActiveDay, circuito }
}

describe('CircuitoDiaSplitView', () => {
  it('muestra punto de partida y link de Google Maps en la primera parada', async () => {
    renderSplit()

    expect(await screen.findByText('Punto de partida')).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: /cómo llegar a circuito peatonal .* se abre en otra pestaña/i,
      }),
    ).toHaveTextContent(/desde mi ubicación/i)
    expect(screen.queryByText(/650 m/)).not.toBeInTheDocument()
  })

  it('abre Sustituir y Eliminar con los handlers de la página', async () => {
    const usuario = user()
    const { onReplace, onDelete } = renderSplit()

    await screen.findByText(/Circuito Peatonal/)
    await usuario.click(screen.getByRole('button', { name: /sustituir circuito peatonal/i }))
    expect(onReplace).toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: /eliminar circuito peatonal/i }))
    expect(onDelete).toHaveBeenCalled()
  })

  it('expone el link del día en el mapa y no el selector A pie / En auto', async () => {
    renderSplit()
    expect(
      await screen.findByRole('link', { name: /ver el día en google maps/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'A pie' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'En auto' })).not.toBeInTheDocument()
  })

  it('al cambiar de día vuelve a la primera parada', async () => {
    const circuito = toCircuitoRecomendado(
      CIRCUITO.alternativas[0],
      'Equilibrado',
      '2026-11-01',
      '2026-11-02',
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <CircuitoDiaSplitView
          circuito={circuito}
          activeDay={1}
          onChangeActiveDay={vi.fn()}
          onBackToList={vi.fn()}
          onExploreMap={vi.fn()}
          onReplaceStop={vi.fn()}
          onDeleteStop={vi.fn()}
          viajeId={2}
        />
      </QueryClientProvider>,
    )

    expect((await screen.findAllByText(/Parada 1 de/)).length).toBeGreaterThan(0)
    rerender(
      <QueryClientProvider client={client}>
        <CircuitoDiaSplitView
          circuito={circuito}
          activeDay={2}
          onChangeActiveDay={vi.fn()}
          onBackToList={vi.fn()}
          onExploreMap={vi.fn()}
          onReplaceStop={vi.fn()}
          onDeleteStop={vi.fn()}
          viajeId={2}
        />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Sin actividades programadas.')).toBeInTheDocument()
  })

  it('en modo recomendado no muestra Sustituir/Eliminar/sugerencias y sí Confirmar', async () => {
    const circuito = toCircuitoRecomendado(CIRCUITO.alternativas[0], 'Equilibrado')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <CircuitoDiaSplitView
          modo="recomendado"
          circuito={circuito}
          activeDay={1}
          onChangeActiveDay={vi.fn()}
          onBackToList={vi.fn()}
          onExploreMap={vi.fn()}
          viajeId={2}
          onConfirmCircuit={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Circuito recomendado')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /confirmar y guardar circuito/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sustituir/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /ver sugerencias/i }),
    ).not.toBeInTheDocument()
  })

  it('en modo recomendado confirmar llama onConfirmCircuit y muestra el modal', async () => {
    const usuario = user()
    const onConfirm = vi.fn()
    const circuito = toCircuitoRecomendado(CIRCUITO.alternativas[0], 'Equilibrado')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <CircuitoDiaSplitView
          modo="recomendado"
          circuito={circuito}
          activeDay={1}
          onChangeActiveDay={vi.fn()}
          onBackToList={vi.fn()}
          onExploreMap={vi.fn()}
          viajeId={2}
          onConfirmCircuit={onConfirm}
          showSuccessModal={false}
          onCloseSuccess={vi.fn()}
          onGoToTrips={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await usuario.click(
      await screen.findByRole('button', { name: /confirmar y guardar circuito/i }),
    )
    expect(onConfirm).toHaveBeenCalled()

    rerender(
      <QueryClientProvider client={client}>
        <CircuitoDiaSplitView
          modo="recomendado"
          circuito={circuito}
          activeDay={1}
          onChangeActiveDay={vi.fn()}
          onBackToList={vi.fn()}
          onExploreMap={vi.fn()}
          viajeId={2}
          onConfirmCircuit={onConfirm}
          showSuccessModal
          onCloseSuccess={vi.fn()}
          onGoToTrips={vi.fn()}
        />
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/circuito guardado con éxito/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver en mis viajes/i })).toBeInTheDocument()
  })

  it('con otra alternativa elegida el botón queda deshabilitado', async () => {
    const circuito = toCircuitoRecomendado(CIRCUITO.alternativas[0], 'Equilibrado')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <CircuitoDiaSplitView
          modo="recomendado"
          circuito={circuito}
          activeDay={1}
          onChangeActiveDay={vi.fn()}
          onBackToList={vi.fn()}
          onExploreMap={vi.fn()}
          viajeId={2}
          selectedStrategy="INTERESES"
          onConfirmCircuit={vi.fn()}
        />
      </QueryClientProvider>,
    )

    const btn = await screen.findByRole('button', {
      name: /ya elegiste otra alternativa/i,
    })
    expect(btn).toBeDisabled()
  })

  it('en modo confirmado hay Sustituir/Eliminar y no hay Confirmar', async () => {
    renderSplit()

    expect(
      (await screen.findAllByRole('button', { name: /sustituir/i })).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /eliminar/i }).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: /confirmar y guardar circuito/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Circuito confirmado')).toBeInTheDocument()
  })

  it('volver atrás en recomendado dispara onBackToList', async () => {
    const usuario = user()
    const onBack = vi.fn()
    const circuito = toCircuitoRecomendado(CIRCUITO.alternativas[0], 'Equilibrado')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <CircuitoDiaSplitView
          modo="recomendado"
          circuito={circuito}
          activeDay={1}
          onChangeActiveDay={vi.fn()}
          onBackToList={onBack}
          onExploreMap={vi.fn()}
          viajeId={2}
          onConfirmCircuit={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await usuario.click(
      await screen.findByRole('button', { name: /volver a circuitos recomendados/i }),
    )
    expect(onBack).toHaveBeenCalled()
  })
})
