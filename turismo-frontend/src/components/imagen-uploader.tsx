import { cn } from 'cn'
import { ImagePlusIcon, LoaderCircleIcon } from 'lucide-react'
import { useRef, useState } from 'react'

import { subirImagen } from '@/api/imagenes'
import { Button } from '@/components/ui/button'
import { toUserMessage } from '@/lib/http'

/** Mismos formatos que valida el backend por firma de bytes. `accept` es solo una ayuda de la UI. */
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

/**
 * Subida de imágenes del evento.
 *
 * Sube el archivo al backend (`POST /api/imagenes`), que lo guarda y devuelve una URL. Esa URL se
 * agrega al `imagenes` del evento vía {@link onUploaded}, que el formulario enchufa al
 * `useFieldArray` de siempre. O sea: subir un archivo es una forma cómoda de completar una fila
 * de URL; el contrato del evento no cambia.
 *
 * El `accept` no reemplaza la validación del backend: el usuario puede forzar un archivo de otro
 * tipo igual, y ahí el backend responde 400 con el mensaje que se muestra acá.
 */
export function ImagenUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function subir(archivos: File[]): Promise<void> {
    // Guarda contra doble submit: mientras una tanda está en vuelo, no se arranca otra.
    if (archivos.length === 0 || subiendo) return

    setSubiendo(true)
    setError(null)
    try {
      for (const archivo of archivos) {
        const { url } = await subirImagen(archivo)
        onUploaded(url)
      }
    } catch (cause) {
      // Si el primero falla, los ya subidos quedaron como filas: no se pierde trabajo previo.
      setError(toUserMessage(cause))
    } finally {
      setSubiendo(false)
      // Sin esto, elegir el mismo archivo otra vez no dispara `onChange` (es el mismo valor).
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(event) => {
          event.preventDefault()
          setArrastrando(false)
          void subir(Array.from(event.dataTransfer.files))
        }}
        className={cn(
          'flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm',
          arrastrando ? 'border-primary bg-secondary' : 'border-border',
        )}
      >
        <input
          ref={inputRef}
          id="imagenes-upload"
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => void subir(Array.from(event.target.files ?? []))}
        />
        <Button asChild variant="outline" size="sm">
          <label htmlFor="imagenes-upload" className="cursor-pointer">
            {subiendo ? (
              <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden />
            ) : (
              <ImagePlusIcon data-icon="inline-start" aria-hidden />
            )}
            {subiendo ? 'Subiendo…' : 'Subir imágenes'}
          </label>
        </Button>
        <p className="text-muted-foreground">
          Arrastrá los archivos o hacé clic. JPG, PNG, WEBP o GIF, hasta 5 MB cada uno.
        </p>
      </div>
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
