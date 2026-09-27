import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { ApiError, apiDelete, apiGet, apiPost, apiPut } from './http'
import { errorBody } from '@/test/fixtures'
import { server } from '@/test/server'

/**
 * Tests de la capa de fetch.
 *
 * El caso que más vale cubrir acá es el 204: `DELETE /api/eventos/{id}` no devuelve cuerpo, y un
 * `response.json()` sobre una respuesta vacía revienta con un `SyntaxError` que el usuario
 * vería como "no se pudo eliminar" aunque el evento se haya borrado. Verificar que `apiDelete`
 * devuelve sin parsear es barato y evita ese bug.
 */

beforeEach(() => {
  // Los handlers de un test no se filtran al siguiente: `setup.ts` los resetea, pero se agrega
  // uno por test y conviene que el punto de partida sea explícito.
  server.resetHandlers()
})

describe('apiGet', () => {
  it('devuelve el cuerpo parseado cuando hay JSON', async () => {
    server.use(
      http.get('/api/ok', () => HttpResponse.json({ listo: true })),
    )

    await expect(apiGet<{ listo: boolean }>('/api/ok')).resolves.toEqual({ listo: true })
  })

  it('devuelve null cuando la respuesta es 200 sin cuerpo', async () => {
    server.use(http.get('/api/vacio', () => new HttpResponse(null, { status: 200 })))

    // Sin genérico: el de `apiGet` es de un solo tipo, y acá importa el valor, no la forma.
    await expect(apiGet('/api/vacio')).resolves.toBeNull()
  })

  it('lanza ApiError con el mensaje del backend y el status', async () => {
    server.use(
      http.get('/api/roto', () =>
        HttpResponse.json(errorBody(404, 'No existe el evento con id 99'), { status: 404 }),
      ),
    )

    const error = await apiGet('/api/roto').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('No existe el evento con id 99')
    expect((error as ApiError).status).toBe(404)
  })
})

describe('apiPost', () => {
  it('envía el cuerpo como JSON y devuelve la respuesta', async () => {
    let recibido: unknown
    server.use(
      http.post('/api/crear', async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ id: 7 }, { status: 201 })
      }),
    )

    // Dos genéricos: respuesta y body, en ese orden. El segundo se infiere del argumento.
    const respuesta = await apiPost<{ id: number }, { nombre: string }>('/api/crear', {
      nombre: 'Nuevo',
    })

    expect(respuesta).toEqual({ id: 7 })
    expect(recibido).toEqual({ nombre: 'Nuevo' })
  })

  it('manda null en los opcionales, no undefined', async () => {
    let recibido: Record<string, unknown> = {}
    server.use(
      http.post('/api/crear', async ({ request }) => {
        recibido = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    await apiPost('/api/crear', { nombre: 'Nuevo', telefono: null })

    // `undefined` desaparecía del JSON al serializar y el backend lo leería como campo ausente.
    expect(Object.keys(recibido).sort()).toEqual(['nombre', 'telefono'])
    expect(recibido.telefono).toBeNull()
  })
})

describe('apiPut', () => {
  it('envía el cuerpo y devuelve el recurso actualizado', async () => {
    let recibido: unknown
    server.use(
      http.put('/api/editar', async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ id: 1, nombre: 'Editado' })
      }),
    )

    const respuesta = await apiPut<{ id: number }, { nombre: string }>('/api/editar', {
      nombre: 'Editado',
    })

    expect(respuesta).toEqual({ id: 1, nombre: 'Editado' })
    expect(recibido).toEqual({ nombre: 'Editado' })
  })
})

describe('apiDelete', () => {
  it('devuelve null ante un 204 sin cuerpo sin parsear nada', async () => {
    server.use(http.delete('/api/borrar', () => new HttpResponse(null, { status: 204 })))

    await expect(apiDelete('/api/borrar')).resolves.toBeNull()
  })

  it('propaga el error si el borrado falla', async () => {
    server.use(
      http.delete('/api/borrar', () =>
        HttpResponse.json(errorBody(404, 'No existe el evento con id 99'), { status: 404 }),
      ),
    )

    await expect(apiDelete('/api/borrar')).rejects.toThrow('No existe el evento con id 99')
  })
})
