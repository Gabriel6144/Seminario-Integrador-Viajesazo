import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/pdfmake', () => ({
  registerBrandFonts: vi.fn(() => Promise.resolve()),
}))

import {
  buildImageProxyUrl,
  loadFirstPhotoDataUrl,
  loadImageDataUrl,
  loadPhotoDataUrl,
  resetPdfAssetsForTests,
} from '@/lib/pdf-assets'

describe('loadPhotoDataUrl', () => {
  beforeEach(() => {
    resetPdfAssetsForTests()
  })

  it('devuelve null cuando la parada no tiene foto', async () => {
    expect(await loadPhotoDataUrl(null)).toBeNull()
    expect(await loadPhotoDataUrl('')).toBeNull()
  })

  it('saltea placeholders y URLs vacías al buscar la primera foto', async () => {
    expect(
      await loadFirstPhotoDataUrl([null, '', 'https://placehold.co/800x500']),
    ).toBeNull()
  })
})

describe('buildImageProxyUrl', () => {
  it('manda las URLs externas al proxy con CORS', () => {
    expect(buildImageProxyUrl('https://cdn.example.com/foto.jpg')).toBe(
      'https://wsrv.nl/?url=https%3A%2F%2Fcdn.example.com%2Ffoto.jpg&w=900&output=jpg',
    )
  })

  it('no proxea las imágenes subidas al backend ni los data URLs', () => {
    expect(buildImageProxyUrl('/api/archivos/foto.jpg')).toBeNull()
    expect(buildImageProxyUrl('data:image/png;base64,abc')).toBeNull()
  })
})

describe('loadImageDataUrl', () => {
  beforeEach(() => {
    resetPdfAssetsForTests()
    vi.unstubAllGlobals()
  })

  it('devuelve null para una URL vacía', async () => {
    expect(await loadImageDataUrl(null)).toBeNull()
    expect(await loadImageDataUrl('')).toBeNull()
  })

  it('convierte una imagen a data URL con fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        blob: async () => ({
          type: 'image/png',
          arrayBuffer: async () => new Uint8Array([97, 98, 99]).buffer,
        }),
      })),
    )

    const result = await loadImageDataUrl('https://example.com/foto.png')

    expect(result).toBe('data:image/png;base64,YWJj')
  })

  it('devuelve null si falla fetch y el canvas no puede dibujar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('CORS')
      }),
    )
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      crossOrigin = ''
      naturalWidth = 0
      naturalHeight = 0
      set src(_value: string) {
        setTimeout(() => this.onerror?.(), 0)
      }
    }
    vi.stubGlobal('Image', FakeImage)

    expect(await loadImageDataUrl('https://example.com/bloqueada.png')).toBeNull()
  })
})
