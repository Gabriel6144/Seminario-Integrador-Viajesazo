import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { PublicadorNuevoPage } from './publicador-nuevo-page'
import { COSQUIN } from '@/test/fixtures'
import { allPublicadores, findPublicadorByEmail, resetStore } from '@/test/store'
import { user, renderRoute } from '@/test/utils'

/**
 * Tests del alta de publicadores.
 *
 * El caso interesante es el email duplicado: el backend responde 400 con un mensaje plano y el
 * formulario tiene que mostrarlo, no tragárselo en un `catch` silencioso ni dejar al usuario
 * con la sensación de que se guardó. También se verifica que un email mal formado **no** llega
 * al servidor, porque la validación de Zod corre antes de la mutación.
 */

function renderAlta() {
  return renderRoute({
    route: '/publicadores/nuevo',
    initialEntry: '/publicadores/nuevo',
    children: <PublicadorNuevoPage />,
  })
}

beforeEach(() => {
  resetStore()
})

describe('PublicadorNuevoPage', () => {
  it('crea el publicador con el teléfono vacío como null', async () => {
    renderAlta()

    await user().type(await screen.findByLabelText('Nombre'), 'Instituto del Agua')
    await user().type(screen.getByLabelText('Email'), 'agua@cordoba.gob.ar')
    await user().click(screen.getByRole('button', { name: 'Crear publicador' }))

    await waitFor(() =>
      expect(findPublicadorByEmail('agua@cordoba.gob.ar')).toBeDefined(),
    )
    expect(findPublicadorByEmail('agua@cordoba.gob.ar')).toMatchObject({
      nombre: 'Instituto del Agua',
      telefono: null,
    })
  })

  it('guarda el teléfono si el usuario lo completa', async () => {
    renderAlta()

    await user().type(await screen.findByLabelText('Nombre'), 'Instituto del Agua')
    await user().type(screen.getByLabelText('Email'), 'agua@cordoba.gob.ar')
    await user().type(screen.getByLabelText('Teléfono'), '0351-4610000')
    await user().click(screen.getByRole('button', { name: 'Crear publicador' }))

    await waitFor(() =>
      expect(findPublicadorByEmail('agua@cordoba.gob.ar')?.telefono).toBe('0351-4610000'),
    )
  })

  it('muestra el mensaje del backend cuando el email ya existe', async () => {
    renderAlta()

    await user().type(await screen.findByLabelText('Nombre'), 'Otro con el mismo mail')
    await user().type(screen.getByLabelText('Email'), COSQUIN.email)
    await user().click(screen.getByRole('button', { name: 'Crear publicador' }))

    expect(
      await screen.findByText('ya existe un publicador con ese email'),
    ).toBeInTheDocument()
    // El rechazo tiene que ser real: no se agrega un publicador con el mismo email.
    expect(allPublicadores().filter((p) => p.email === COSQUIN.email)).toHaveLength(1)
  })

  it('no manda nada si el email no tiene formato válido', async () => {
    renderAlta()
    const totalAntes = allPublicadores().length

    await user().type(await screen.findByLabelText('Nombre'), 'Sin mail válido')
    await user().type(screen.getByLabelText('Email'), 'esto-no-es-un-mail')
    await user().click(screen.getByRole('button', { name: 'Crear publicador' }))

    expect(await screen.findByText('el email no tiene un formato válido')).toBeInTheDocument()
    expect(allPublicadores()).toHaveLength(totalAntes)
  })

  it('exige el nombre', async () => {
    renderAlta()
    const totalAntes = allPublicadores().length

    await user().type(await screen.findByLabelText('Email'), 'nuevo@cordoba.gob.ar')
    await user().click(screen.getByRole('button', { name: 'Crear publicador' }))

    expect(await screen.findByText('el nombre es obligatorio')).toBeInTheDocument()
    expect(allPublicadores()).toHaveLength(totalAntes)
  })

  it('deja reintentar tras un rechazo por email duplicado', async () => {
    // El error del servidor no tiene que dejar el formulario inservible: el usuario corrige el
    // email y reintenta.
    renderAlta()

    await user().type(await screen.findByLabelText('Nombre'), 'Instituto del Agua')
    await user().type(screen.getByLabelText('Email'), COSQUIN.email)
    await user().click(screen.getByRole('button', { name: 'Crear publicador' }))
    await screen.findByText('ya existe un publicador con ese email')

    await user().clear(screen.getByLabelText('Email'))
    await user().type(screen.getByLabelText('Email'), 'agua@cordoba.gob.ar')
    await user().click(screen.getByRole('button', { name: 'Crear publicador' }))

    await waitFor(() => expect(findPublicadorByEmail('agua@cordoba.gob.ar')).toBeDefined())
  })
})
