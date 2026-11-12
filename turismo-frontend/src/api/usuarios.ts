import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { queryKeys } from '@/api/queries'
import { ApiError, apiGet, apiPatch, apiPost } from '@/lib/http'
import type { Page, RolUsuario, UsuarioRequest, UsuarioResponse } from '@/types/api'

/**
 * Módulo de usuarios (PLANTILLA FRONTEND).
 *
 * El backend de usuarios todavía no está implementado. Para que las pantallas se puedan ver y
 * probar sin API, este módulo usa un store mock en memoria por defecto.
 *
 * Contrato esperado (ajustar cuando el backend esté listo):
 * - GET    /api/usuarios?page=&size=&q=&rol=  -> Page<UsuarioResponse>
 * - POST   /api/usuarios                      -> UsuarioResponse (201)
 * - PATCH  /api/usuarios/:id/baja             -> UsuarioResponse (o {estado})  [sugerido]
 *
 * Conexión al backend real:
 * 1. Definir `VITE_USE_USUARIOS_MOCK=false` (o eliminar el uso del mock).
 * 2. Ajustar paths/shape en las llamadas HTTP de abajo si difieren.
 * 3. Alinear tipos en `src/types/api.ts` y handlers/fixtures de MSW.
 */
const USE_MOCK = (import.meta.env.VITE_USE_USUARIOS_MOCK ?? 'true') !== 'false'

const MOCK_DELAY_MS = 250

let nextId = 5
let mockUsuarios: UsuarioResponse[] = [
  { id: 1, nombre: 'Juan', apellido: 'Pérez', email: 'juan@email.com', rol: 'TURISTA', estado: 'ACTIVO', fechaAlta: '2026-10-12' },
  { id: 2, nombre: 'Carolina', apellido: 'Gómez', email: 'carolina.turismo@cordoba.gob.ar', rol: 'PUBLICADOR', estado: 'ACTIVO', fechaAlta: '2026-09-05' },
  { id: 3, nombre: 'Martín', apellido: 'Soria', email: 'msoria@viajesazo.com', rol: 'ADMINISTRADOR', estado: 'ACTIVO', fechaAlta: '2026-01-18' },
  { id: 4, nombre: 'Lucía', apellido: 'Benítez', email: 'lucia.b@gmail.com', rol: 'TURISTA', estado: 'ACTIVO', fechaAlta: '2026-08-02' },
]

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS))
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function toPage<T>(items: T[], page: number, size: number): Page<T> {
  const totalElements = items.length
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const start = page * size
  const content = items.slice(start, start + size)
  return {
    content,
    page: { size, number: page, totalElements, totalPages },
  }
}

export interface UsuariosFilters {
  q?: string
  rol?: RolUsuario | 'TODOS'
}

function listMock(page: number, size: number, filters: UsuariosFilters): Page<UsuarioResponse> {
  const q = normalize((filters.q ?? '').trim())
  const rol = filters.rol ?? 'TODOS'
  let items = [...mockUsuarios]
  if (rol !== 'TODOS') items = items.filter((u) => u.rol === rol)
  if (q.length > 0) {
    items = items.filter((u) => {
      const haystack = normalize(`${u.nombre} ${u.apellido} ${u.email}`)
      return haystack.includes(q)
    })
  }
  // Más recientes primero por id (plantilla); ajustar al orden real del backend.
  items.sort((a, b) => b.id - a.id)
  return toPage(items, page, size)
}

async function fetchUsuarios(
  page: number,
  size: number,
  filters: UsuariosFilters,
  signal?: AbortSignal,
): Promise<Page<UsuarioResponse>> {
  if (USE_MOCK) {
    return delay(listMock(page, size, filters))
  }
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.rol && filters.rol !== 'TODOS') params.set('rol', filters.rol)
  return apiGet<Page<UsuarioResponse>>(`/api/usuarios?${params.toString()}`, signal)
}

export function useUsuarios(page: number, filters: UsuariosFilters = {}, size: number = PAGE_SIZE) {
  const q = filters.q ?? ''
  const rol = filters.rol ?? 'TODOS'
  return useQuery({
    queryKey: queryKeys.usuarios(page, size, q, rol),
    queryFn: ({ signal }) => fetchUsuarios(page, size, { q, rol }, signal),
    placeholderData: keepPreviousData,
  })
}

export function useCrearUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: UsuarioRequest) => {
      if (USE_MOCK) {
        const email = request.email.trim().toLowerCase()
        if (mockUsuarios.some((u) => u.email.toLowerCase() === email)) {
          throw new ApiError(400, { status: 400, message: 'ya existe un usuario con ese email' })
        }
        const created: UsuarioResponse = {
          id: nextId++,
          nombre: request.nombre.trim(),
          apellido: request.apellido.trim(),
          email: request.email.trim(),
          rol: request.rol,
          estado: 'ACTIVO',
          fechaAlta: new Date().toISOString().slice(0, 10),
        }
        mockUsuarios = [created, ...mockUsuarios]
        return delay(created)
      }
      return apiPost<UsuarioResponse, UsuarioRequest>('/api/usuarios', request)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.usuariosAll() })
    },
  })
}

export function useBajaUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (USE_MOCK) {
        const idx = mockUsuarios.findIndex((u) => u.id === id)
        if (idx === -1) throw new ApiError(404, { status: 404, message: 'No existe el usuario' })
        const updated: UsuarioResponse = { ...mockUsuarios[idx], estado: 'INACTIVO' }
        mockUsuarios = mockUsuarios.map((u) => (u.id === id ? updated : u))
        return delay(updated)
      }
      // Contrato sugerido; ajustar método/path según backend (p.ej. DELETE o PATCH con body).
      return apiPatch<UsuarioResponse, { estado: 'INACTIVO' }>(`/api/usuarios/${id}/baja`, {
        estado: 'INACTIVO',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.usuariosAll() })
    },
  })
}

export function getUsuariosMockState() {
  return { useMock: USE_MOCK }
}
