import { describe, expect, it } from 'vitest'

import {
  EVENTO_FORM_DEFAULT,
  eventoSchema,
  publicadorSchema,
  toEventoFormValues,
  toEventoRequest,
  toPublicadorRequest,
  type EventoFormValues,
} from './schemas'
import { FOLKLORE } from '@/test/fixtures'

/**
 * Tests de los schemas de los formularios.
 *
 * Los mensajes que se verifican son los mismos del backend, a propósito: si divergen, el usuario
 * lee dos textos distintos para el mismo error según desde dónde lo haya tocado. Y los tests
 * cubren sobre todo las conversiones que no son obvias, que son las que rompen en silencio: el
 * `"" → null`, el recorte de `LocalTime` y el aplanado de las filas de imágenes.
 */

function formValido(overrides: Partial<EventoFormValues> = {}): EventoFormValues {
  return {
    ...EVENTO_FORM_DEFAULT,
    nombre: 'Festival de Folklore',
    fechaInicio: '2026-10-01',
    fechaFin: '2026-10-04',
    publicadorId: '1',
    ...overrides,
  }
}

describe('eventoSchema', () => {
  it('acepta un evento mínimo con los cuatro campos obligatorios', () => {
    const resultado = eventoSchema.safeParse(formValido())

    expect(resultado.success).toBe(true)
  })

  it('exige nombre, fecha de inicio, fecha de finalización y publicador', () => {
    const resultado = eventoSchema.safeParse(EVENTO_FORM_DEFAULT)

    expect(resultado.success).toBe(false)
    if (resultado.success) return

    const campos = resultado.error.issues.map((issue) => issue.path.join('.'))
    expect(campos).toEqual(
      expect.arrayContaining(['nombre', 'fechaInicio', 'fechaFin', 'publicadorId']),
    )
  })

  it('rechaza que la fecha de finalización sea anterior a la de inicio', () => {
    const resultado = eventoSchema.safeParse(
      formValido({ fechaInicio: '2026-10-10', fechaFin: '2026-10-01' }),
    )

    expect(resultado.success).toBe(false)
    if (resultado.success) return
    expect(resultado.error.issues[0]?.message).toBe(
      'la fecha de finalización no puede ser anterior a la de inicio',
    )
  })

  it('acepta que la fecha de finalización sea el mismo día', () => {
    // `fechaFin < fechaInicio` es la regla del backend, no `<=`: un evento de un solo día es
    // legítimo y rechazarlo sería más restrictivo que la API.
    expect(eventoSchema.safeParse(formValido({ fechaInicio: '2026-10-01', fechaFin: '2026-10-01' })).success).toBe(true)
  })

  it('rechaza que el horario de finalización sea anterior o igual al de inicio', () => {
    const resultado = eventoSchema.safeParse(
      formValido({ horarioInicio: '20:00', horarioFin: '19:00' }),
    )

    expect(resultado.success).toBe(false)
    if (resultado.success) return
    expect(resultado.error.issues[0]?.message).toBe(
      'el horario de finalización debe ser posterior al de inicio',
    )
  })

  it('no compara horarios si falta alguno de los dos', () => {
    // El backend solo compara cuando ambos vienen informados (`validateRange` tiene un
    // `&&`). Reclamar más que la API haría que un formulario rechace algo que el servidor
    // acepta, que es peor que dejar pasar algo.
    expect(
      eventoSchema.safeParse(formValido({ horarioInicio: '', horarioFin: '19:00' })).success,
    ).toBe(true)
    expect(
      eventoSchema.safeParse(formValido({ horarioInicio: '20:00', horarioFin: '' })).success,
    ).toBe(true)
  })

  it('rechaza una fila de imagen agregada y dejada en blanco', () => {
    const resultado = eventoSchema.safeParse(formValido({ imagenes: [{ url: '' }] }))

    expect(resultado.success).toBe(false)
    if (resultado.success) return
    expect(resultado.error.issues[0]?.message).toBe('Ingresá la URL o quitá la fila.')
  })

  it('acepta una lista de imágenes vacía', () => {
    // Vacía no es lo mismo que inválida: `[]` es lo que borra las imágenes del evento.
    expect(eventoSchema.safeParse(formValido({ imagenes: [] })).success).toBe(true)
  })

  it('rechaza un publicador que no es un entero positivo', () => {
    expect(eventoSchema.safeParse(formValido({ publicadorId: '0' })).success).toBe(false)
    expect(eventoSchema.safeParse(formValido({ publicadorId: 'abc' })).success).toBe(false)
  })
})

describe('toEventoRequest', () => {
  it('convierte los opcionales vacíos en null y no en cadena vacía', () => {
    // La trampa principal del CRUD: un input sin llenar es `""`, y `""` no es "sin valor" —
    // se guardaría como cadena vacía en la base. (Medido contra la API real: Jackson coerciona
    // `""` a `null` en `LocalDate` y `LocalTime`, así que mandarlo no rompe igual, pero el
    // `LocalTime` sin `@NotNull` se guarda vacío con 201 y eso tampoco es lo que el usuario
    // quiso al dejar el campo en blanco.)
    const request = toEventoRequest(
      formValido({ descripcion: '   ', localidad: '', horarioInicio: '', imagenes: [] }),
    )

    expect(request.descripcion).toBeNull()
    expect(request.localidad).toBeNull()
    expect(request.direccion).toBeNull()
    expect(request.horarioInicio).toBeNull()
    expect(request.categoria).toBeNull()
  })

  it('manda el aplanado de las filas de imágenes como string[]', () => {
    const request = toEventoRequest(
      formValido({
        imagenes: [{ url: 'https://cdn.test/a.jpg' }, { url: ' https://cdn.test/b.jpg ' }],
      }),
    )

    expect(request.imagenes).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'])
  })

  it('manda siempre un array de imágenes, nunca null, para que un PUT pueda borrarlas', () => {
    // `null` en un PUT le dice al mapper "conservá lo que hay": con null, quitar todas las
    // imágenes del formulario no las borraría.
    const request = toEventoRequest(formValido({ imagenes: [] }))

    expect(request.imagenes).toEqual([])
  })

  it('convierte el publicador a número y la categoría a su nombre del enum', () => {
    const request = toEventoRequest(formValido({ publicadorId: '3', categoria: 'CULTURA' }))

    expect(request.publicadorId).toBe(3)
    expect(request.categoria).toBe('CULTURA')
  })
})

describe('toEventoFormValues', () => {
  it('recorta los segundos que devuelve la API para que los input de hora los acepten', () => {
    // La API responde "20:00:00" y `<input type="time">` no acepta segundos: sin el recorte el
    // input queda en blanco y la edición perdería el horario.
    const values = toEventoFormValues(FOLKLORE)

    expect(values.horarioInicio).toBe('20:00')
    expect(values.horarioFin).toBe('23:30')
  })

  it('convierte los null de la respuesta en cadenas vacías para los input', () => {
    const values = toEventoFormValues({
      ...FOLKLORE,
      descripcion: null,
      localidad: null,
      direccion: null,
      categoria: null,
      horarioInicio: null,
      horarioFin: null,
      imagenes: [],
    })

    expect(values.descripcion).toBe('')
    expect(values.localidad).toBe('')
    expect(values.categoria).toBe('')
    expect(values.horarioInicio).toBe('')
    expect(values.imagenes).toEqual([])
  })

  it('convierte las imágenes de la respuesta en filas editables', () => {
    const values = toEventoFormValues(FOLKLORE)

    expect(values.imagenes).toEqual([{ url: FOLKLORE.imagenes[0] }])
  })

  it('da un formulario que vuelve a pasar por el schema y produce el mismo request', () => {
    // Ida y vuelta: lo que se ve en la edición, si se guarda sin tocar nada, tiene que volver
    // a ser el mismo evento. Es la prueba de que el recorte de los segundos y la conversión de
    // null a vacío no pierden información en el camino.
    const request = toEventoRequest(toEventoFormValues(FOLKLORE))

    expect(request).toEqual({
      nombre: FOLKLORE.nombre,
      descripcion: FOLKLORE.descripcion,
      categoria: FOLKLORE.categoria,
      localidad: FOLKLORE.localidad,
      direccion: FOLKLORE.direccion,
      fechaInicio: FOLKLORE.fechaInicio,
      fechaFin: FOLKLORE.fechaFin,
      // Vuelven como "20:00" y no como "20:00:00", y `LocalTime` acepta las dos formas.
      horarioInicio: '20:00',
      horarioFin: '23:30',
      imagenes: FOLKLORE.imagenes,
      publicadorId: FOLKLORE.publicadorId,
    })
  })
})

describe('publicadorSchema', () => {
  it('exige nombre y email con formato', () => {
    const resultado = publicadorSchema.safeParse({ nombre: 'X', email: 'no-es-un-email', telefono: '' })

    expect(resultado.success).toBe(false)
    if (resultado.success) return
    expect(resultado.error.issues[0]?.message).toBe('el email no tiene un formato válido')
  })

  it('distingue email vacío de email inválido, como los dos @NotBlank/@Email del backend', () => {
    const vacio = publicadorSchema.safeParse({ nombre: 'X', email: '   ', telefono: '' })
    expect(vacio.success).toBe(false)
    if (vacio.success) return
    expect(vacio.error.issues[0]?.message).toBe('el email es obligatorio')
  })
})

describe('toPublicadorRequest', () => {
  it('manda el teléfono vacío como null', () => {
    const request = toPublicadorRequest({ nombre: 'Turismo Córdoba', email: 'a@b.com.ar', telefono: '' })

    expect(request.telefono).toBeNull()
    expect(request.nombre).toBe('Turismo Córdoba')
  })
})
