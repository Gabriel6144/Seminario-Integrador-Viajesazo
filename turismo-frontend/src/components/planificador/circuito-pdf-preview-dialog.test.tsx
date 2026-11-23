import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadMock } = vi.hoisted(() => ({ downloadMock: vi.fn() }))

vi.mock('@/lib/pdf-assets', () => ({
  loadBrandFonts: vi.fn(() => Promise.resolve()),
  loadCanvasFonts: vi.fn(() => Promise.resolve()),
  loadLogoDataUrl: vi.fn(() => Promise.resolve('data:image/png;base64,logo')),
  loadHeroDataUrl: vi.fn(() => Promise.resolve('data:image/jpeg;base64,hero')),
}))

vi.mock('@/lib/circuito-mapa-captura', () => ({
  captureCircuitoDiaMapa: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/circuito-pdf-day-map', () => ({
  composeDayMapDataUrl: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/circuito-pdf-hero', () => ({
  composeHeroDataUrl: vi.fn(() => Promise.resolve('data:image/png;base64,hero')),
  buildNumberBadgeDataUrl: vi.fn(() => Promise.resolve('data:image/png;base64,badge')),
  buildOutlineBadgeDataUrl: vi.fn(() => Promise.resolve('data:image/png;base64,badge')),
}))

vi.mock('@/lib/circuito-pdf', () => ({
  buildCircuitoPdfDefinition: vi.fn(() => ({ content: ['test'] })),
  DAY_BADGE_COLORS: ['#0083ca'],
  SUMMARY_HERO: { width: 392, height: 565 },
  buildSummaryData: vi.fn(() => ({
    title: 'Córdoba',
    ribbon: '1 DÍA DE CULTURA',
    heroBadge: 'CÓRDOBA · CIRCUITO',
    heroStatLabel: 'DÍAS',
    heroStatValue: '1',
    heroTitle: 'Circuito confirmado de ejemplo',
    heroMeta: '1 día · 1 parada · 1,0 km',
    days: [
      {
        number: 1,
        label: 'DÍA 1',
        title: 'CENTRO',
        location: 'Centro, Córdoba',
        stops: [
          {
            globalNumber: 1,
            number: 1,
            title: 'Museo de la Ciudad',
            hours: '09:00 - 10:00',
            category: 'Cultura',
          },
        ],
      },
    ],
  })),
}))

vi.mock('@/lib/pdfmake', () => ({
  loadPdfMake: vi.fn(async () => ({
    addVirtualFileSystem: vi.fn(),
    addFonts: vi.fn(),
    createPdf: () => ({
      getBlob: async () => new Blob(['%PDF'], { type: 'application/pdf' }),
      download: downloadMock,
    }),
  })),
  registerBrandFonts: vi.fn(),
}))

import { CircuitoPdfPreviewDialog } from '@/components/planificador/circuito-pdf-preview-dialog'
import type {
  CircuitoRecomendado,
  ParadaCircuitoDetalle,
} from '@/components/planificador/types'
import { BORRADORES } from '@/test/fixtures'
import { user } from '@/test/utils'

function stop(overrides: Partial<ParadaCircuitoDetalle> = {}): ParadaCircuitoDetalle {
  return {
    id: '1',
    number: 1,
    time: '09:00',
    title: 'Museo de la Ciudad',
    category: 'Cultura',
    badgeClass: '',
    description: '',
    detailDescription: '',
    location: 'Centro, Córdoba',
    hours: '09:00 - 10:00',
    price: 'Entrada gratuita',
    image: '',
    images: [],
    tipo: 'EVENTO',
    fecha: '2026-10-20',
    horaInicio: '09:00',
    horaFin: '10:00',
    trasladoKm: 1.2,
    trasladoMinutos: 8,
    duration: '1 h',
    walkNext: '1,2 km · 8 min de traslado',
    latitud: -31.4,
    longitud: -64.2,
    disponible: true,
    motivoNoDisponible: null,
    ...overrides,
  }
}

const CIRCUITO: CircuitoRecomendado = {
  id: 'INTERESES',
  estrategia: 'INTERESES',
  title: 'A tu medida',
  affinity: '87% Afinidad',
  image: '',
  categoryTag: '',
  categoryIcon: '',
  daysLabel: '1 Día',
  paceLabel: 'Equilibrado',
  chips: [],
  ventajas: [],
  consideraciones: [],
  days: [{ number: 1, fecha: '2026-10-20', label: 'Martes 20', summary: '1 parada · 1 km' }],
  stopsByDay: { 1: [stop()] },
}

describe('CircuitoPdfPreviewDialog', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:preview'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    })
  })

  it('genera el PDF, muestra el preview y permite descargarlo', async () => {
    const usuario = user()
    render(
      <CircuitoPdfPreviewDialog
        abierto
        circuito={CIRCUITO}
        viaje={BORRADORES[1]}
        onClose={vi.fn()}
      />,
    )

    const preview = await screen.findByTitle('Vista previa del PDF')
    expect(preview).toHaveAttribute('src', 'blob:preview')

    await usuario.click(screen.getByRole('button', { name: /Descargar PDF/i }))

    await waitFor(() => expect(downloadMock).toHaveBeenCalled())
    expect(downloadMock.mock.calls[0][0]).toMatch(/^circuito-.*\.pdf$/)
  })

  it('muestra el error y ofrece reintentar', async () => {
    const { loadPdfMake } = await import('@/lib/pdfmake')
    vi.mocked(loadPdfMake).mockResolvedValueOnce({
      addVirtualFileSystem: vi.fn(),
      addFonts: vi.fn(),
      createPdf: () => ({
        getBlob: () => Promise.reject(new Error('No se pudo generar')),
        download: downloadMock,
      }),
    } as never)

    render(
      <CircuitoPdfPreviewDialog
        abierto
        circuito={CIRCUITO}
        viaje={BORRADORES[1]}
        onClose={vi.fn()}
      />,
    )

    expect(await screen.findByText(/No se pudo generar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument()
  })
})
