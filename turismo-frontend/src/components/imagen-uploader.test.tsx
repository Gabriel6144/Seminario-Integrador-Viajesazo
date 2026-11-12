import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ImagenUploader } from './imagen-uploader'
import { renderWithProviders, user } from '@/test/utils'

describe('ImagenUploader', () => {
  // El mock devuelve una URL fija (ver `handlers.ts`): el nombre del archivo no llega por el
  // multipart en jsdom, y el componente no lo usa igual. Lo que importa es que la URL devuelta
  // por el backend sea la que se entrega al formulario.
  const URL_SUBIDA = '/api/archivos/subida.png'

  it('sube el archivo y entrega la URL que devuelve el backend', async () => {
    const onUploaded = vi.fn()
    renderWithProviders(<ImagenUploader onUploaded={onUploaded} />)

    const archivo = new File(['bytes'], 'foto.png', { type: 'image/png' })
    await user().upload(screen.getByLabelText(/subir imágenes/i), archivo)

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(URL_SUBIDA)
    })
  })

  it('sube varios archivos elegidos de una sola vez', async () => {
    const onUploaded = vi.fn()
    renderWithProviders(<ImagenUploader onUploaded={onUploaded} />)

    await user().upload(screen.getByLabelText(/subir imágenes/i), [
      new File(['a'], 'uno.png', { type: 'image/png' }),
      new File(['b'], 'dos.jpg', { type: 'image/jpeg' }),
    ])

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(2))
    expect(onUploaded).toHaveBeenNthCalledWith(1, URL_SUBIDA)
    expect(onUploaded).toHaveBeenNthCalledWith(2, URL_SUBIDA)
  })

  it('muestra el error del backend y no agrega ninguna fila si rechaza el archivo', async () => {
    const onUploaded = vi.fn()
    renderWithProviders(<ImagenUploader onUploaded={onUploaded} />)

    await user().upload(
      screen.getByLabelText(/subir imágenes/i),
      new File([], 'vacio.png', { type: 'image/png' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se recibió ningún archivo de imagen.',
    )
    expect(onUploaded).not.toHaveBeenCalled()
  })
})
