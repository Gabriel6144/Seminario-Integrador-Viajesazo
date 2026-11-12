import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Paso5Radio } from './paso-5-radio'
import type { DestinoSeleccionado } from './types'

const mapa = vi.hoisted(() => ({
  props: [] as Array<{ destino: DestinoSeleccionado | null; radiusKm?: number }>,
}))

vi.mock('./destino-mapa', () => ({
  DestinoMapa: (props: { destino: DestinoSeleccionado | null; radiusKm?: number }) => {
    mapa.props.push(props)
    return <div data-testid="destino-mapa" />
  },
}))

const CORDOBA: DestinoSeleccionado = {
  nombre: 'Villa Carlos Paz',
  ciudad: 'Villa Carlos Paz',
  localidad: 'Valle de Punilla',
  latitud: -31.4241,
  longitud: -64.4978,
}

function renderPaso5(destino: DestinoSeleccionado | null, radiusKm = 8) {
  const onChangeRadiusKm = vi.fn()
  const onNext = vi.fn()

  render(
    <Paso5Radio
      destino={destino}
      radiusKm={radiusKm}
      sliderKmId="radio-km"
      isValid
      onChangeRadiusKm={onChangeRadiusKm}
      onNext={onNext}
    />,
  )

  return { onChangeRadiusKm, onNext }
}

describe('Paso5Radio', () => {
  beforeEach(() => {
    mapa.props.length = 0
  })

  it('permite estirar el radio hasta el tope provincial de 250 km', () => {
    renderPaso5(CORDOBA)

    const slider = screen.getByLabelText(/distancia máxima de viaje/i)
    expect(slider).toHaveAttribute('max', '250')
  })

  it('aplica los presets de distancia', async () => {
    const user = userEvent.setup()
    const { onChangeRadiusKm } = renderPaso5(CORDOBA)

    await user.click(screen.getByRole('button', { name: /cerca/i }))
    await user.click(screen.getByRole('button', { name: /región/i }))
    await user.click(screen.getByRole('button', { name: /provincia/i }))

    expect(onChangeRadiusKm).toHaveBeenNthCalledWith(1, 10)
    expect(onChangeRadiusKm).toHaveBeenNthCalledWith(2, 50)
    expect(onChangeRadiusKm).toHaveBeenNthCalledWith(3, 250)
  })

  it('le pasa al mapa el destino y el radio actual', async () => {
    renderPaso5(CORDOBA, 120)

    await screen.findByTestId('destino-mapa')

    expect(mapa.props.at(-1)).toEqual({ destino: CORDOBA, radiusKm: 120 })
  })

  it('avisa cuando todavía no hay una zona de destino', async () => {
    renderPaso5(null)

    expect(screen.queryByTestId('destino-mapa')).not.toBeInTheDocument()
    expect(screen.getByText(/todavía no elegiste una zona de destino/i)).toBeInTheDocument()

    await waitFor(() => expect(mapa.props).toHaveLength(0))
  })
})
