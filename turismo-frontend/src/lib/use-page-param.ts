import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Lee y escribe el número de página desde la URL.
 *
 * El estado vive en el query param y no en `useState` a propósito: la URL queda compartible,
 * el botón "atrás" del navegador funciona, y recargar no pierde la posición. Además cada página
 * es un estado navegable por el router en vez de un render condicional.
 *
 * El número es **base 0**, igual que el `?page=` del backend. Se mantiene la misma convención en
 * los dos lados a propósito: mezclar base 0 y base 1 entre la URL y la API es la forma más fácil
 * de meter un off-by-one sin que se note.
 */
export function usePageParam(): [number, (page: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get('page')
  const page = parsePage(raw)

  const setPage = useCallback(
    (next: number) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          if (next <= 0) {
            // La primera página no deja rastro en la URL: `/eventos` se ve más limpio que
            // `/eventos?page=0`.
            params.delete('page')
          } else {
            params.set('page', String(next))
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [page, setPage]
}

const PAGE_PATTERN = /^\d+$/

function parsePage(raw: string | null): number {
  if (raw === null || !PAGE_PATTERN.test(raw)) return 0
  return Number(raw)
}
