import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { EventoEditarPage } from './evento-editar-page'
import { COSQUIN, FOLKLORE, TURISMO } from '@/test/fixtures'
import { findEvento, resetStore } from '@/test/store'
import { user, renderRoute } from '@/test/utils'

/**
 * Tests de la edición de eventos.
 *
 * La edición tiene dos trampas que solo aparecen al ir y volver contra el store:
 *
 * 1. La API devuelve los horarios con segundos y los `<input type="time">` no los aceptan, así
 *    que el recorte tiene que ocurrir al hidratar el formulario, no al mandar el PUT.
 * 2. En un PUT, `imagenes: []` **borra** las imágenes y `null` las conserva. Si el formulario
 *    mandara `null` al vaciar la lista, quitar una imagen no borraría nada y el test pasaría
 *    sin detectar el bug.
 */

function renderEdicion(id: string) {
  return renderRoute({
    route: '/eventos/:id/editar',
    initialEntry: `/eventos/${id}/editar`,
    children: <EventoEditarPage />,
  })
}

async function esperarFormulario() {
  return screen.findByLabelText('Nombre')
}

async function elegirPublicador(nombre: string) {
  await user().click(await screen.findByRole('combobox', { name: 'Publicador' }))
  await user().click(await screen.findByRole('option', { name: nombre }))
}

beforeEach(() => {
  resetStore()
})

describe('EventoEditarPage', () => {
  it('carga el evento y precarga los horarios sin los segundos que devuelve la API', async () => {
    renderEdicion('1')

    const nombre = await esperarFormulario()
    expect(nombre).toHaveValue(FOLKLORE.nombre)
    // "20:00:00" en la respuesta, "20:00" en el input: sin el recorte el input quedaría vacío.
    expect(screen.getByLabelText('Horario de inicio')).toHaveValue('20:00')
    expect(screen.getByLabelText('Horario de finalización')).toHaveValue('23:30')
    expect(screen.getByLabelText('URL de la imagen 1')).toHaveValue(
      'https://cdn.cordoba.gob.ar/folklore-cosquin.jpg',
    )
  })

  it('actualiza el nombre y lo refleja en el store', async () => {
    renderEdicion('1')
    const nombre = await esperarFormulario()

    await user().clear(nombre)
    await user().type(nombre, 'Festival de Folklore 2026')
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(findEvento(1)?.nombre).toBe('Festival de Folklore 2026'))
    // Lo que no se tocó se mantiene: un PUT reemplaza el recurso entero.
    expect(findEvento(1)?.fechaInicio).toBe(FOLKLORE.fechaInicio)
  })

  it('conserva las imágenes si el usuario no toca la lista', async () => {
    renderEdicion('1')
    await esperarFormulario()

    await user().clear(screen.getByLabelText('Nombre'))
    await user().type(screen.getByLabelText('Nombre'), 'Con imagen')
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(findEvento(1)?.nombre).toBe('Con imagen'))
    expect(findEvento(1)?.imagenes).toEqual(FOLKLORE.imagenes)
  })

  it('borra las imágenes cuando el usuario quita la última fila', async () => {
    renderEdicion('1')
    await esperarFormulario()

    await user().click(screen.getByRole('button', { name: 'Quitar la imagen 1' }))
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(findEvento(1)?.imagenes).toEqual([]))
  })

  it('reemplaza el publicador y actualiza el nombre aplanado del evento', async () => {
    renderEdicion('1')
    await esperarFormulario()

    await elegirPublicador(COSQUIN.nombre)
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(findEvento(1)?.publicadorId).toBe(COSQUIN.id))
    // El backend no lo manda: lo arma con un JOIN. Si el PUT no lo actualizara, el detalle
    // mostraría el publicador viejo.
    expect(findEvento(1)?.publicadorNombre).toBe(COSQUIN.nombre)
  })

  it('deja convertir los opcionales en null al vaciarlos', async () => {
    renderEdicion('1')
    await esperarFormulario()

    await user().clear(screen.getByLabelText('Descripción'))
    await user().clear(screen.getByLabelText('Horario de inicio'))
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(findEvento(1)?.descripcion).toBeNull())
    expect(findEvento(1)?.horarioInicio).toBeNull()
  })

  it('no manda nada si la fecha de finalización queda antes de la de inicio', async () => {
    renderEdicion('1')
    await esperarFormulario()

    await user().clear(screen.getByLabelText('Fecha de finalización'))
    await user().type(screen.getByLabelText('Fecha de finalización'), '2026-09-01')
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('la fecha de finalización no puede ser anterior a la de inicio'),
    ).toBeInTheDocument()
    expect(findEvento(1)?.fechaFin).toBe(FOLKLORE.fechaFin)
  })

  it('muestra un error si el evento no existe', async () => {
    renderEdicion('999')

    expect(await screen.findByText('No existe el evento con id 999')).toBeInTheDocument()
  })

  it('mantiene el publicador seleccionado en el trigger tras cargar', async () => {
    // El `Select` controlado arranca con `value` vacío y muestra el placeholder: si los
    // `defaultValues` no tuvieran el id, la edición perdería el publicador al guardar.
    renderEdicion('1')
    await esperarFormulario()

    expect(await screen.findByRole('combobox', { name: 'Publicador' })).toHaveTextContent(
      TURISMO.nombre,
    )
  })
})
