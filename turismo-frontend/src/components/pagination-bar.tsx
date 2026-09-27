import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import type { Page } from '@/types/api'

/**
 * Controles de paginación sobre la `Page` de Spring Data.
 *
 * Recibe la `Page` tal cual la devuelve el backend (con `page.*` anidado) y un `onPageChange`. No
 * pide datos: el estado de la página vive en la URL (ver `usePageParam`) y los requests los hace
 * el hook de la vista. Por eso este componente es puro y testeable sin servidor.
 */
export function PaginationBar({
  page,
  onPageChange,
}: {
  page: Page<unknown>
  onPageChange: (page: number) => void
}) {
  const { number, totalElements, totalPages, size } = page.page

  const atFirst = number === 0
  const atLast = number >= totalPages - 1
  const first = totalElements === 0 ? 0 : number * size + 1
  const last = Math.min((number + 1) * size, totalElements)

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {totalElements === 0 ? 'Sin resultados' : `Mostrando ${first}–${last} de ${totalElements}`}
      </p>

      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Anterior"
                aria-disabled={atFirst}
                className={atFirst ? DISABLED : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  // La guarda va explícita y no confiar en la clase: `pointer-events: none`
                  // depende del CSS cargado y `aria-disabled` es solo para lectores de pantalla,
                  // así que el clic igual llegaría y mandaría `page = -1`.
                  if (atFirst) return
                  onPageChange(number - 1)
                }}
              />
            </PaginationItem>

            {buildPageItems(number, totalPages).map((item) =>
              item === 'gap' ? (
                <PaginationItem key="gap">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === number}
                    onClick={(event) => {
                      event.preventDefault()
                      onPageChange(item)
                    }}
                  >
                    {item + 1}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                text="Siguiente"
                aria-disabled={atLast}
                className={atLast ? DISABLED : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (atLast) return
                  onPageChange(number + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}

/** Menos opaco + sin pointer events, para que el estado deshabilitado se vea y se note. */
const DISABLED = 'pointer-events-none opacity-50'

/**
 * Números de página a mostrar, con huecos marcados.
 *
 * Devuelve índices 0-based, igual que la API. Con pocos páginas los muestra todos; con muchos,
 * la primera, la última y una ventana de dos alrededor de la actual.
 */
function buildPageItems(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index)

  const items: Array<number | 'gap'> = [0]
  const start = Math.max(1, current - 1)
  const end = Math.min(total - 2, current + 1)

  if (start > 1) items.push('gap')
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < total - 2) items.push('gap')

  items.push(total - 1)
  return items
}
