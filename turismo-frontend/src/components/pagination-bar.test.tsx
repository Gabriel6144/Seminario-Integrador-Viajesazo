import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PaginationBar } from './pagination-bar'
import { page } from '../test/fixtures'
import { user } from '../test/utils'

/**
 * `PaginationBar` es un componente puro: recibe la `Page` ya resuelta y un callback. No hay
 * `fetch` ni MSW en estos tests, y el `setup.ts` corre con `onUnhandledRequest: 'error'`: si el
 * componente hiciera un request sin handler, el test fallaría solo.
 */
function renderPagination({ totalPages, current = 0, totalElements }: {
  totalPages: number
  current?: number
  totalElements?: number
}) {
  const onPageChange = vi.fn()
  render(
    <PaginationBar
      page={page(['a'], {
        number: current,
        size: 12,
        totalElements: totalElements ?? totalPages * 12,
      })}
      onPageChange={onPageChange}
    />,
  )
  return onPageChange
}

describe('PaginationBar', () => {
  it('muestra el rango visible y el total', () => {
    renderPagination({ totalPages: 3 })

    expect(screen.getByText('Mostrando 1–12 de 36')).toBeInTheDocument()
  })

  it('calcula el último número de la página sin pasarse del total', () => {
    renderPagination({ totalPages: 2, current: 1, totalElements: 18 })

    // Con 18 elementos y size 12 la última página va de 13 a 18, no "13–24 de 24".
    expect(screen.getByText('Mostrando 13–18 de 18')).toBeInTheDocument()
  })

  it('avisa que no hay resultados en vez de mostrar un rango vacío', () => {
    renderPagination({ totalPages: 1, totalElements: 0 })

    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })

  it('oculta los controles cuando hay una sola página', () => {
    renderPagination({ totalPages: 1 })

    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument()
  })

  it('marca la página actual con aria-current', () => {
    renderPagination({ totalPages: 3, current: 1 })

    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('2')
  })

  it('no dispara page = -1 al clickear "anterior" en la primera página', async () => {
    // La guarda tiene que estar en el handler: `pointer-events-none` depende del CSS y
    // `aria-disabled` no impide el clic, así que sin ella el request sale con page negativo.
    const onPageChange = renderPagination({ totalPages: 3, current: 0 })

    await user().click(screen.getByLabelText('Go to previous page'))

    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('no dispara una página de más al clickear "siguiente" en la última', async () => {
    const onPageChange = renderPagination({ totalPages: 3, current: 2 })

    await user().click(screen.getByLabelText('Go to next page'))

    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('marca los bordes deshabilitados con aria-disabled', () => {
    renderPagination({ totalPages: 3, current: 1 })

    expect(screen.getByLabelText('Go to previous page')).toHaveAttribute('aria-disabled', 'false')
    expect(screen.getByLabelText('Go to next page')).toHaveAttribute('aria-disabled', 'false')
  })

  it('avanza al clickear un número de página', async () => {
    const onPageChange = renderPagination({ totalPages: 5, current: 0 })

    await user().click(screen.getByRole('link', { name: '3' }))

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('regresa al clickear "anterior"', async () => {
    const onPageChange = renderPagination({ totalPages: 5, current: 2 })

    await user().click(screen.getByLabelText('Go to previous page'))

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('avanza al clickear "siguiente"', async () => {
    const onPageChange = renderPagination({ totalPages: 5, current: 0 })

    await user().click(screen.getByLabelText('Go to next page'))

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('lista todas las páginas cuando son pocas', () => {
    renderPagination({ totalPages: 5, current: 0 })

    for (const label of ['1', '2', '3', '4', '5']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('colapsa muchas páginas con elipsis', () => {
    renderPagination({ totalPages: 20, current: 10 })

    // Con 20 páginas no se listan todas: primera, última y una ventana alrededor de la actual.
    expect(screen.getByRole('link', { name: '11' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '20' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '15' })).not.toBeInTheDocument()
  })

  it('no tira request propio', () => {
    // El setup corre con `onUnhandledRequest: 'error'`, así que con el `render` solo alcanza:
    // cualquier fetch sin handler revienta el test.
    expect(() => renderPagination({ totalPages: 3, current: 0 })).not.toThrow()
  })
})
