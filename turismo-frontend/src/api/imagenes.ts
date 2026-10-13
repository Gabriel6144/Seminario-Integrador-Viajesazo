import { apiPostForm } from '@/lib/http'
import type { ImagenResponse } from '@/types/api'

/**
 * Sube un archivo de imagen al backend y devuelve la URL con la que queda servido.
 *
 * El backend valida tipo (por firma de bytes), tamaño y cantidad, y responde 400 con un mensaje
 * en español si rechaza el archivo. Esa URL es la que después viaja dentro del `imagenes` del
 * evento: no hay entidad de imagen, el `Evento` sigue guardando `List<String>`.
 */
export function subirImagen(archivo: File, signal?: AbortSignal): Promise<ImagenResponse> {
  const formData = new FormData()
  formData.append('archivo', archivo)
  return apiPostForm<ImagenResponse>('/api/imagenes', formData, signal)
}
