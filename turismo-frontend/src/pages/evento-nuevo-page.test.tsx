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
  await user().click(screen.getByRole('combobox', { name: 'Categoría turística' }))
  await user().click(await screen.findByRole('option', { name: 'Cultura' }))
  await user().click(screen.getByRole('combobox', { name: 'Tipo de propuesta' }))
  await user().click(await screen.findByRole('option', { name: 'Festival' }))
  await user().click(screen.getByRole('combobox', { name: 'Modalidad' }))
  await user().click(await screen.findByRole('option', { name: 'Pedestre' }))
  await user().type(screen.getByLabelText('Lugar o recinto'), 'Anfiteatro Municipal')
  await user().type(screen.getByLabelText('Ciudad / Localidad'), 'Villa Carlos Paz')
  await user().type(screen.getByLabelText('Dirección exacta o referencia'), 'Av. San Martín 500')
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
      categoria: 'CULTURA',
      tipoPropuesta: 'FESTIVAL',
      modalidad: 'PEDESTRE',
      // El evento arranca gratuito (default del backend) y en estado INICIADO, que es una regla
      // de negocio que el usuario no manda.
      tipoAcceso: 'GRATUITO',
      estadoPropuesta: 'INICIADO',
      montoEstimado: null,
      descripcionArancel: null,
      sitioOficial: null,
      lugarRecinto: 'Anfiteatro Municipal',
      localidad: 'Villa Carlos Paz',
      direccion: 'Av. San Martín 500',
      horarioInicio: null,
      horarioFin: null,
      // Sin filas de imagen, un array vacío: es lo que `toEventoRequest` garantiza.
      imagenes: [],
      publicadorId: TURISMO.id,
      // El nombre del publicador viene aplanado por el backend, no se manda.
      publicadorNombre: TURISMO.nombre,
    })
  }, 15_000)

  it('muestra el bloque de arancel solo al elegir un evento arancelado', async () => {
    renderAlta()
    await buscarFormulario()

    expect(screen.queryByLabelText('Monto estimado')).not.toBeInTheDocument()

    await user().click(screen.getByRole('combobox', { name: 'Tipo de acceso' }))
    await user().click(await screen.findByRole('option', { name: 'Arancelado' }))

    expect(await screen.findByLabelText('Monto estimado')).toBeInTheDocument()
    expect(screen.getByLabelText('Sitio oficial de la boletería o entradas')).toBeInTheDocument()
  })

  it('no crea un evento arancelado sin monto ni link', async () => {
    renderAlta()
    await completarObligatorios()
    await user().click(screen.getByRole('combobox', { name: 'Tipo de acceso' }))
    await user().click(await screen.findByRole('option', { name: 'Arancelado' }))

    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(
      await screen.findByText('el monto estimado es obligatorio para un evento arancelado'),
    ).toBeInTheDocument()
    expect(allEventos().some((evento) => evento.nombre === 'Festival de Invierno')).toBe(false)
  }, 15_000)

  it('crea el evento arancelado con monto y link', async () => {
    renderAlta()
    await completarObligatorios()
    await user().click(screen.getByRole('combobox', { name: 'Tipo de acceso' }))
    await user().click(await screen.findByRole('option', { name: 'Arancelado' }))
    await user().type(await screen.findByLabelText('Monto estimado'), '2500')
    await user().type(
      screen.getByLabelText('Sitio oficial de la boletería o entradas'),
      'https://entradas.cordoba.gob.ar/invierno',
    )

    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    const guardado = await waitFor(() => {
      const encontrados = allEventos().filter((evento) => evento.nombre === 'Festival de Invierno')
      expect(encontrados).toHaveLength(1)
      return encontrados[0]
    })

    expect(guardado).toMatchObject({
      tipoAcceso: 'DE_PAGO',
      montoEstimado: 2500,
      sitioOficial: 'https://entradas.cordoba.gob.ar/invierno',
    })
  }, 15_000)

  it('crea el evento con todos los opcionales que el usuario completó', async () => {
    renderAlta()
    await completarObligatorios()
    await user().type(screen.getByLabelText('Descripción completa'), 'Espectáculo de invierno')
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
      tipoPropuesta: 'FESTIVAL',
      modalidad: 'PEDESTRE',
      horarioInicio: '20:00',
      horarioFin: '23:00',
      imagenes: ['https://cdn.test/invierno.jpg'],
    })
  }, 15_000)

  it('agrega la URL de una imagen subida y la manda al crear el evento', async () => {
    renderAlta()
    await completarObligatorios()

    await user().upload(
      screen.getByLabelText(/subir imágenes/i),
      new File(['bytes'], 'foto.png', { type: 'image/png' }),
    )

    // La URL que devuelve el backend queda como una fila más del `useFieldArray` de imágenes.
    expect(await screen.findByLabelText('URL de la imagen 1')).toHaveValue(
      '/api/archivos/subida.png',
    )

    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    const guardado = await waitFor(() => {
      const encontrados = allEventos().filter((evento) => evento.nombre === 'Festival de Invierno')
      expect(encontrados).toHaveLength(1)
      return encontrados[0]
    })

    expect(guardado).toMatchObject({ imagenes: ['/api/archivos/subida.png'] })
  }, 15_000)

  it('no manda nada si se envía vacío y muestra los errores de campo', async () => {
    renderAlta()
    await buscarFormulario()

    const totalAntes = allEventos().length
    await user().click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(await screen.findByText('el nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('la categoría es obligatoria')).toBeInTheDocument()
    expect(screen.getByText('el tipo de propuesta es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('la modalidad es obligatoria')).toBeInTheDocument()
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
