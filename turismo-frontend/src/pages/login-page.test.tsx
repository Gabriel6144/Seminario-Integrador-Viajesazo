import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { AuthProvider } from '@/components/auth-provider'
import { clearAccessToken } from '@/lib/auth-session'
import { LoginPage } from '@/pages/login-page'
import { user } from '@/test/utils'

function renderLogin(initialEntry = '/login') {
  clearAccessToken()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider skipBootstrap>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Inicio público</div>} />
            <Route path="/borradores" element={<div>Mis viajes</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  it('muestra el botón Volver', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('inicia sesión y navega al next', async () => {
    renderLogin('/login?next=%2Fborradores')

    await user().type(screen.getByLabelText('Email'), 'turista@test.com')
    await user().type(screen.getByLabelText('Contraseña'), 'Turista123!')
    await user().click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Mis viajes')).toBeInTheDocument()
  })

  it('muestra error con credenciales inválidas', async () => {
    renderLogin()

    await user().type(screen.getByLabelText('Email'), 'turista@test.com')
    await user().type(screen.getByLabelText('Contraseña'), 'mala')
    await user().click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/email o contraseña incorrectos/i)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
    })
  })

  it('permite mostrar y ocultar la contraseña', async () => {
    renderLogin()

    const password = screen.getByLabelText('Contraseña')
    expect(password).toHaveAttribute('type', 'password')

    await user().click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(password).toHaveAttribute('type', 'text')

    await user().click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('muestra mensaje genérico al solicitar recuperación de contraseña', async () => {
    renderLogin()

    await user().click(screen.getByRole('button', { name: '¿Olvidó su contraseña?' }))
    expect(screen.getByRole('heading', { name: 'Recuperar contraseña' })).toBeInTheDocument()

    await user().type(screen.getByLabelText('Email'), 'cualquiera@test.com')
    await user().click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      /Si el correo existe, recibirás un mail para restablecer tu contraseña/i,
    )
  })
})
