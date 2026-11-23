import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  composeDayGalleryDataUrl,
  DAY_GALLERY,
  galleryLayout,
  remainingGalleryStops,
  selectGalleryStops,
  type DayGalleryStop,
} from '@/lib/circuito-pdf-day-gallery'

function stop(number: number): DayGalleryStop {
  return {
    number,
    time: `0${number}:00`,
    title: `Parada ${number} del día`,
    category: 'Cultura',
    duration: '1 h',
    description: 'Una descripción corta para probar la tarjeta editorial.',
    location: 'Centro, Córdoba',
    imageDataUrl: null,
  }
}

function fakeContext(): CanvasRenderingContext2D {
  return {
    scale: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 3 })),
    arc: vi.fn(),
    setLineDash: vi.fn(),
    filter: 'none',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  } as unknown as CanvasRenderingContext2D
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('galería del día', () => {
  it('muestra como máximo tres tarjetas y cuenta las que sobran', () => {
    expect(selectGalleryStops([1, 2, 3, 4, 5])).toEqual([1, 2, 3])
    expect(remainingGalleryStops(5)).toBe(2)
    expect(remainingGalleryStops(3)).toBe(0)
    expect(remainingGalleryStops(1)).toBe(0)
  })

  it('reparte las tarjetas centradas según cuántas haya', () => {
    const three = galleryLayout(3)
    expect(three.columns).toBe(3)
    expect(three.startX).toBeCloseTo(0, 5)
    expect(three.cardWidth).toBeCloseTo((DAY_GALLERY.width - 36) / 3, 5)

    const two = galleryLayout(2)
    expect(two.columns).toBe(2)
    expect(two.cardWidth).toBe(210)
    expect(two.startX).toBeCloseTo((DAY_GALLERY.width - 444) / 2, 5)

    const one = galleryLayout(1)
    expect(one.columns).toBe(1)
    expect(one.cardWidth).toBe(250)
    expect(one.startX).toBeCloseTo((DAY_GALLERY.width - 250) / 2, 5)
  })

  it('no compone nada si el día no tiene paradas', async () => {
    expect(await composeDayGalleryDataUrl({ stops: [] })).toBeNull()
  })

  it('dibuja las tarjetas y la pastilla de paradas restantes', async () => {
    const context = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,galeria',
    )

    const result = await composeDayGalleryDataUrl({
      stops: [stop(1), stop(2), stop(3), stop(4), stop(5)],
    })

    expect(result).toBe('data:image/jpeg;base64,galeria')
    expect(context.fillText).toHaveBeenCalledWith(
      '+ 2 PARADAS MÁS',
      expect.any(Number),
      expect.any(Number),
    )
    expect(context.fillText).toHaveBeenCalledWith(
      'PARADA 01',
      expect.any(Number),
      expect.any(Number),
    )
  })
})
