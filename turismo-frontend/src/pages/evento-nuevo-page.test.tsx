import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { EventoNuevoPage } from './evento-nuevo-page'
import { TURISMO } from '@/test/fixtures'
import { allEventos, resetStore } from '@/test/store'
import { user, renderRoute } from '@/test/utils'
import type { UsuarioResponse } from '@/types/api'

const PUBLICADOR: UsuarioResponse = {
  id: 10,
  nombre: TURISMO.nombre,
  email: 'publicador@test.com',
  telefono: null,
  roles: ['PUBLICADOR'],
  publicadorId: TURISMO.id,
}

const TURISTA: UsuarioResponse = {
  id: 1,
  nombre: 'Turista Demo',
  email: 'turista@test.com',
  telefono: null,
  roles: ['TURISTA'],
  publicadorId: null,
}

/**
 * Tests del alta de eventos.
 *
 * El foco no es que el formulario "no reviente" sino dos cosas concretas: que la request salga
 * con el body **exacto** que espera el backend (los opcionales en `null`, no en `""`) y que el
 * evento creado se vea en el listado. Lo segundo obliga a los handlers a ser stateful: si el alta
 * no modificara la grilla, el test detectaría un bug de invalidación de caché.
 *
 * Desde VZ-13 el publicador sale de la sesión y la descripción, los horarios y al menos una
 * imagen son obligatorios.
 */

/** Renderiza la página como ruta real, con un destino donde comprobar la navegación. */
function renderAlta(user: UsuarioResponse = PUBLICADOR) {
  return renderRoute({
    route: '/eventos/nuevo',
    initialEntry: '/eventos/nuevo',
    children: <EventoNuevoPage />,
    user,
    authenticated: true,
  })
}

async function abrirSeccion(nombre: string | RegExp) {
  const patron = typeof nombre === 'string' ? new RegExp(`(Abrir|Cerrar) ${nombre}`) : nombre
  const boton = screen.getByRole('button', { name: patron })
  if (boton.getAttribute('aria-expanded') === 'false') {
    await user().click(boton)
  }
}

async function completarObligatorios() {
  await abrirSeccion(/Datos Principales/)
  const nombre = await buscarFormulario()
  await user().type(nombre, 'Festival de Invierno')
  await user().type(screen.getByLabelText('Descripción completa'), 'Espectáculo de invierno')
  await user().click(screen.getByRole('combobox', { name: 'Categoría turística' }))
  await user().click(await screen.findByRole('option', { name: 'Cultura' }))
  await user().click(screen.getByRole('combobox', { name: 'Tipo de propuesta' }))
  await user().click(await screen.findByRole('option', { name: 'Festival' }))

  await abrirSeccion(/Agenda de la propuesta/)
  await user().type(screen.getByLabelText('Fecha de inicio'), '2027-07-01')
  await user().type(screen.getByLabelText('Fecha de finalización'), '2027-07-05')

  await abrirSeccion(/Horarios del evento/)
  await user().type(screen.getByLabelText('Horario de inicio'), '20:00')
  await user().type(screen.getByLabelText('Horario de finalización'), '23:00')

  await abrirSeccion(/Ubicación en Córdoba/)
  await user().type(screen.getByLabelText('Lugar o recinto'), 'Anfiteatro Municipal')
  await user().type(screen.getByLabelText('Ciudad / Localidad'), 'Villa Carlos Paz')
  await user().type(screen.getByLabelText('Dirección exacta o referencia'), 'Av. San Martín 500')

  await abrirSeccion(/Imágenes del Evento/)
  await user().click(screen.getByRole('button', { name: /Agregar imagen/ }))
  await user().type(screen.getByLabelText('URL de la imagen 1'), 'https://cdn.test/invierno.jpg')

  await abrirSeccion(/Tipo de Acceso y Arancel/)
  await user().click(screen.getByRole('combobox', { name: 'Tipo de acceso' }))
  await user().click(await screen.findByRole('option', { name: 'Gratuito' }))
}

/**
 * El formulario aparece recién después de que carga la sesión: antes hay un skeleton.
 * Esperar por el campo es lo que evita el `getBy` contra un árbol que todavía no existe.
 */
function buscarFormulario() {
  return screen.findByLabelText('Nombre del evento')
}

beforeEach(() => {
  resetStore()
})

describe('EventoNuevoPage', () => {
  it('avisa si la cuenta no está vinculada a un publicador', async () => {
    // Sin publicador de sesión no hay autoría posible: el backend ignoraría cualquier id que
    // mandara el cliente. Es un callejón sin salida que se resuelve antes del formulario.
    renderAlta(TURISTA)

    expect(await screen.findByText('No se pudo cargar la información')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre del evento')).not.toBeInTheDocument()
  })

  it('solo ofrece tipos compatibles con un evento', async () => {
    renderAlta()
    await buscarFormulario()

    await user().click(screen.getByRole('combobox', { name: 'Tipo de propuesta' }))

    expect(await screen.findByRole('option', { name: 'Festival' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Visita guiada' })).not.toBeInTheDocument()
  })

  it('al cambiar a actividad ofrece visitas guiadas y deportivas', async () => {
    renderAlta()
    await buscarFormulario()

    await user().click(screen.getByRole('button', { name: /Actividad turística/i }))
    await user().click(screen.getByRole('combobox', { name: 'Tipo de propuesta' }))

    expect(await screen.findByRole('option', { name: 'Visita guiada' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Deportivo' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Festival' })).not.toBeInTheDocument()
  })

  it('mantiene una sola sección abierta a la vez', async () => {
    renderAlta()
    await buscarFormulario()

    expect(screen.getByRole('button', { name: /Datos Principales/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const fechas = screen.getByRole('button', { name: /Agenda de la propuesta/ })
    expect(fechas).toHaveAttribute('aria-expanded', 'false')

    await user().click(fechas)

    expect(fechas).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Datos Principales/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('no avanza si la sección actual tiene errores', async () => {
    renderAlta()
    await buscarFormulario()

    await user().click(screen.getByRole('button', { name: /Continuar/ }))

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Agenda de la propuesta/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('abre la agenda propia en un modal', async () => {
    renderAlta()
    await buscarFormulario()
    await abrirSeccion(/Agenda de la propuesta/)

    await user().click(screen.getByRole('button', { name: /Ver mi agenda/ }))

    expect(await screen.findByRole('dialog', { name: 'Mi agenda' })).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog', { name: 'Mi agenda' })).not.toBeInTheDocument()
  })

  it('no marca Acceso como completo hasta elegir el tipo', async () => {
    renderAlta()
    await buscarFormulario()

    expect(screen.getByText('0/6 secciones completas')).toBeInTheDocument()

    await abrirSeccion(/Tipo de Acceso y Arancel/)
    await user().click(screen.getByRole('combobox', { name: 'Tipo de acceso' }))
    await user().click(await screen.findByRole('option', { name: 'Gratuito' }))

    expect(screen.getByText('1/6 secciones completas')).toBeInTheDocument()
  })

  it('crea el evento con el body exacto que espera el backend', async () => {
    renderAlta()
    await completarObligatorios()

    await user().click(screen.getByRole('button', { name: 'Crear propuesta' }))

    const guardado = await waitFor(() => {
      const encontrados = allEventos().filter((evento) => evento.nombre === 'Festival de Invierno')
      expect(encontrados).toHaveLength(1)
      return encontrados[0]
    })

    expect(guardado).toMatchObject({
      descripcion: 'Espectáculo de invierno',
      categoria: 'CULTURA',
      tipoPropuesta: 'FESTIVAL',
      modalidad: null,
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
      horarioInicio: '20:00',
      horarioFin: '23:00',
      imagenes: ['https://cdn.test/invierno.jpg'],
      publicadorId: TURISMO.id,
      // El nombre del publicador viene aplanado por el backend, no se manda.
      publicadorNombre: TURISMO.nombre,
    })
  }, 15_000)

  it('muestra el bloque de arancel solo al elegir un evento arancelado', async () => {
    renderAlta()
    await buscarFormulario()
    await abrirSeccion(/Tipo de Acceso y Arancel/)

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

    await user().click(screen.getByRole('button', { name: 'Crear propuesta' }))

    expect(
      await screen.findByText('El monto estimado es obligatorio para un evento arancelado.'),
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

    await user().click(screen.getByRole('button', { name: 'Crear propuesta' }))

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

  it('persiste la descripción, el horario y la imagen obligatorios', async () => {
    renderAlta()
    await completarObligatorios()

    await user().click(screen.getByRole('button', { name: 'Crear propuesta' }))

    const guardado = await waitFor(() => {
      const encontrados = allEventos().filter((evento) => evento.nombre === 'Festival de Invierno')
      expect(encontrados).toHaveLength(1)
      return encontrados[0]
    })

    expect(guardado).toMatchObject({
      descripcion: 'Espectáculo de invierno',
      horarioInicio: '20:00',
      horarioFin: '23:00',
      imagenes: ['https://cdn.test/invierno.jpg'],
    })
  }, 15_000)

  it('agrega la URL de una imagen subida como una fila del formulario', async () => {
    renderAlta()
    await buscarFormulario()
    await abrirSeccion(/Imágenes del Evento/)

    await user().upload(
      screen.getByLabelText(/subir imágenes/i),
      new File(['bytes'], 'foto.png', { type: 'image/png' }),
    )

    // La URL que devuelve el backend queda como una fila más del `useFieldArray` de imágenes.
    expect(await screen.findByLabelText('URL de la imagen 1')).toHaveValue(
      '/api/archivos/subida.png',
    )
  }, 15_000)

  it('no manda nada si se envía vacío y muestra los errores de campo', async () => {
    renderAlta()
    await buscarFormulario()

    const totalAntes = allEventos().length
    await user().click(screen.getByRole('button', { name: 'Crear propuesta' }))

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La descripción es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La categoría es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('El tipo de propuesta es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El horario de inicio es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El horario de finalización es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('Elegí el tipo de acceso.')).toBeInTheDocument()
    expect(screen.getByText('Cargá al menos una imagen para el evento.')).toBeInTheDocument()
    expect(allEventos()).toHaveLength(totalAntes)
  })

  it('no crea el evento si faltan las fechas', async () => {
    renderAlta()
    const nombre = await buscarFormulario()
    await user().type(nombre, 'Sin fechas')

    await user().click(screen.getByRole('button', { name: 'Crear propuesta' }))

    expect(allEventos().some((evento) => evento.nombre === 'Sin fechas')).toBe(false)
  })
})
