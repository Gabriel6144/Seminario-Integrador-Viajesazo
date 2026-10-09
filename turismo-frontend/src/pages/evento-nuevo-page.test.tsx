import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { EventoNuevoPage } from './evento-nuevo-page'
import { EVENTOS, TURISMO } from '@/test/fixtures'
import { allEventos, allPublicadores, resetStore } from '@/test/store'
import { user, renderRoute } from '@/test/utils'

const EVENTOS_POR_DEFECTO = EVENTOS.length

/**
 * Tests del alta de eventos.
 *
 * El foco no es que el formulario "no reviente" sino dos cosas concretas: que la request salga
 * con el body **exacto** que espera el backend (los opcionales en `null`, no en `""`) y que el
 * evento creado se vea en el listado. Lo segundo obliga a los handlers a ser stateful: si el alta
 * no modificara la grilla, el test detectaría un bug de invalidación de caché.
 */

/** Renderiza la página como ruta real, con un destino donde comprobar la navegación. */
function renderAlta() {
  return renderRoute({
    route: '/eventos/nuevo',
    initialEntry: '/eventos/nuevo',
    children: <EventoNuevoPage />,
  })
}

async function elegirPublicador(nombre: string) {
  await user().click(await screen.findByRole('combobox', { name: 'Publicador' }))
  await user().click(await screen.findByRole('option', { name: nombre }))
}

async function completarObligatorios() {
  const nombre = await buscarFormulario()
  await user().type(nombre, 'Festival de Invierno')
  await user().type(screen.getByLabelText('Fecha de inicio'), '2026-07-01')
  await user().type(screen.getByLabelText('Fecha de finalización'), '2026-07-05')
  await elegirPublicador(TURISMO.nombre)
}

/**
 * El formulario aparece recién después de que cargan los publicadores: antes hay un skeleton.
 * Esperar por el campo es lo que evita el `getBy` contra un árbol que todavía no existe.
 */
function buscarFormulario() {
  return screen.findByLabelText('Nombre del evento')
}

beforeEach(() => {
  resetStore()
})

describe('EventoNuevoPage', () => {
  it('avisa y no deja continuar si no hay publicadores cargados', async () => {
    // Un evento sin publicador es inválido para el backend: es un callejón sin salida que el
    // usuario tiene que resolver antes de tocar el formulario.
    allPublicadores().splice(0, allPublicadores().length)

    renderAlta()

    expect(await screen.findByText('No hay publicadores cargados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear publicador' })).toHaveAttribute(
      'href',
      '/publicadores/nuevo',
    )
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('crea el evento con el body exacto que espera el backend', async () => {
    renderAlta()
    await completarObligatorios()

    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    const guardado = await waitFor(() => {
      const encontrados = allEventos().filter((evento) => evento.nombre === 'Festival de Invierno')
      expect(encontrados).toHaveLength(1)
      return encontrados[0]
    })

    expect(guardado).toMatchObject({
      // Los opcionales que el usuario no llenó van como null, nunca como "".
      descripcion: null,
      categoria: null,
      localidad: null,
      direccion: null,
      horarioInicio: null,
      horarioFin: null,
      // Sin filas de imagen, un array vacío: es lo que `toEventoRequest` garantiza.
      imagenes: [],
      publicadorId: TURISMO.id,
      // El nombre del publicador viene aplanado por el backend, no se manda.
      publicadorNombre: TURISMO.nombre,
    })
  })

  it('crea el evento con todos los opcionales que el usuario completó', async () => {
    renderAlta()
    await completarObligatorios()
    await user().type(screen.getByLabelText('Descripción completa'), 'Espectáculo de invierno')
    await user().click(screen.getByRole('combobox', { name: 'Categoría turística' }))
    await user().click(await screen.findByRole('option', { name: 'Cultura' }))
    await user().type(screen.getByLabelText('Horario de inicio'), '20:00')
    await user().type(screen.getByLabelText('Horario de finalización'), '23:00')
    await user().click(screen.getByRole('button', { name: /Agregar imagen/ }))
    await user().type(screen.getByLabelText('URL de la imagen 1'), 'https://cdn.test/invierno.jpg')

    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    const guardado = await waitFor(() => {
      const encontrados = allEventos().filter((evento) => evento.nombre === 'Festival de Invierno')
      expect(encontrados).toHaveLength(1)
      return encontrados[0]
    })

    expect(guardado).toMatchObject({
      descripcion: 'Espectáculo de invierno',
      categoria: 'CULTURA',
      horarioInicio: '20:00',
      horarioFin: '23:00',
      imagenes: ['https://cdn.test/invierno.jpg'],
    })
  })

  it('no manda nada si se envía vacío y muestra los errores de campo', async () => {
    renderAlta()
    await buscarFormulario()

    const totalAntes = allEventos().length
    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(await screen.findByText('el nombre es obligatorio')).toBeInTheDocument()
    expect(allEventos()).toHaveLength(totalAntes)
  })

  it('no crea el evento si faltan las fechas', async () => {
    renderAlta()
    const nombre = await buscarFormulario()
    await user().type(nombre, 'Sin fechas')
    await elegirPublicador(TURISMO.nombre)

    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(allEventos().some((evento) => evento.nombre === 'Sin fechas')).toBe(false)
  })

  it('no crea el evento si no se eligió publicador', async () => {
    // El `Select` de Radix muestra el error en un portal, así que lo que se verifica es el
    // efecto: no se creó nada.
    renderAlta()
    const nombre = await buscarFormulario()
    await user().type(nombre, 'Sin publicador')
    await user().type(screen.getByLabelText('Fecha de inicio'), '2026-07-01')
    await user().type(screen.getByLabelText('Fecha de finalización'), '2026-07-05')

    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    await waitFor(() => expect(allEventos()).toHaveLength(EVENTOS_POR_DEFECTO))
    expect(allEventos().some((evento) => evento.nombre === 'Sin publicador')).toBe(false)
  })
})
