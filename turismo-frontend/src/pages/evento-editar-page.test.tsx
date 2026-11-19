import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EventoEditarPage } from './evento-editar-page'
import { FOLKLORE, GASTRONOMIA_ESTANCIA } from '@/test/fixtures'
import { findEvento, resetStore } from '@/test/store'
import { user, renderRoute } from '@/test/utils'

// MapLibre no tiene WebGL en jsdom. La edición no necesita el mapa real: se reemplaza por un
// placeholder para que el formulario monte sin lanzar el error del painter.
vi.mock('@/components/evento-form/evento-mapa-selector', () => ({
  EventoMapaSelector: () => (
    <div role="img" aria-label="Mapa de la ubicación elegida" />
  ),
}))

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
  return screen.findByLabelText('Nombre del evento')
}

async function abrirSeccion(nombre: string | RegExp) {
  const patron = typeof nombre === 'string' ? new RegExp(`(Abrir|Cerrar) ${nombre}`) : nombre
  const boton = screen.getByRole('button', { name: patron })
  if (boton.getAttribute('aria-expanded') === 'false') {
    await user().click(boton)
  }
}

beforeEach(() => {
  resetStore()
})

describe('EventoEditarPage', () => {
  it('carga el evento y precarga los horarios sin los segundos que devuelve la API', async () => {
    renderEdicion('1')

    const nombre = await esperarFormulario()
    expect(nombre).toHaveValue(FOLKLORE.nombre)
    await abrirSeccion(/Horarios del evento/)
    // "20:00:00" en la respuesta, "20:00" en el input: sin el recorte el input quedaría vacío.
    expect(screen.getByLabelText('Horario de inicio')).toHaveValue('20:00')
    expect(screen.getByLabelText('Horario de finalización')).toHaveValue('23:30')
    await abrirSeccion(/Imágenes del Evento/)
    expect(screen.getByLabelText('URL de la imagen 1')).toHaveValue(
      FOLKLORE.imagenes[0],
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

    await user().clear(screen.getByLabelText('Nombre del evento'))
    await user().type(screen.getByLabelText('Nombre del evento'), 'Con imagen')
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(findEvento(1)?.nombre).toBe('Con imagen'))
    expect(findEvento(1)?.imagenes).toEqual(FOLKLORE.imagenes)
  })

  it('exige al menos una imagen también al editar', async () => {
    renderEdicion('1')
    await esperarFormulario()
    await abrirSeccion(/Imágenes del Evento/)

    await user().click(screen.getByRole('button', { name: 'Quitar la imagen 1' }))
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('Cargá al menos una imagen para el evento.'),
    ).toBeInTheDocument()
    expect(findEvento(1)?.imagenes).toEqual(FOLKLORE.imagenes)
  })

  it('no muestra el selector de publicador', async () => {
    renderEdicion('1')
    await esperarFormulario()

    expect(screen.queryByLabelText('Publicador')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Publicador' })).not.toBeInTheDocument()
  })

  it('exige descripción y horario al editar', async () => {
    renderEdicion('1')
    await esperarFormulario()

    await user().clear(screen.getByLabelText('Descripción completa'))
    await abrirSeccion(/Horarios del evento/)
    await user().clear(screen.getByLabelText('Horario de inicio'))
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('La descripción es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('El horario de inicio es obligatorio.')).toBeInTheDocument()
    expect(findEvento(1)?.descripcion).toBe(FOLKLORE.descripcion)
    expect(findEvento(1)?.horarioInicio).toBe(FOLKLORE.horarioInicio)
  })

  it('no manda nada si la fecha de finalización queda antes de la de inicio', async () => {
    renderEdicion('1')
    await esperarFormulario()
    await abrirSeccion(/Agenda de la propuesta/)

    await user().clear(screen.getByLabelText('Fecha de finalización'))
    await user().type(screen.getByLabelText('Fecha de finalización'), '2026-09-01')
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    // El mensaje puede aparecer más de una vez (FieldError + descripción del schema).
    expect(
      await screen.findAllByText('La fecha de finalización no puede ser anterior a la de inicio.'),
    ).not.toHaveLength(0)
    expect(findEvento(1)?.fechaFin).toBe(FOLKLORE.fechaFin)
  })

  it('muestra un error si el evento no existe', async () => {
    renderEdicion('999')

    expect(await screen.findByText('No existe el evento con id 999')).toBeInTheDocument()
  })

  it('precarga el arancel de un evento arancelado y lo limpia al pasar a gratuito', async () => {
    renderEdicion('3')
    await esperarFormulario()
    await abrirSeccion(/Tipo de Acceso y Arancel/)

    expect(screen.getByLabelText('Monto estimado')).toHaveValue(GASTRONOMIA_ESTANCIA.montoEstimado)
    expect(screen.getByLabelText('Sitio oficial de la boletería o entradas')).toHaveValue(
      GASTRONOMIA_ESTANCIA.sitioOficial,
    )

    await user().click(screen.getByRole('combobox', { name: 'Tipo de acceso' }))
    await user().click(await screen.findByRole('option', { name: 'Gratuito' }))
    await user().click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(findEvento(3)?.tipoAcceso).toBe('GRATUITO'))
    // Al dejar de ser arancelado, el monto y el link no pueden quedar colgados en la base.
    expect(findEvento(3)?.montoEstimado).toBeNull()
    expect(findEvento(3)?.sitioOficial).toBeNull()
  })
})
