import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { queryKeys } from '@/api/queries'
import { ApiError, apiGet, apiPost } from '@/lib/http'
import type {
  BajaUsuarioResponse,
  Page,
  RolUsuario,
  UsuarioBajaRequest,
  UsuarioRequest,
  UsuarioResponse,
} from '@/types/api'

/**
 * Usuarios.
 *
 * Registro público: siempre `POST /api/usuarios`.
 * Listado admin: `GET /api/usuarios` (paginado). `VITE_USE_USUARIOS_MOCK=true` fuerza mock offline.
 */
const USE_MOCK = (import.meta.env.VITE_USE_USUARIOS_MOCK ?? 'false') === 'true'

const MOCK_DELAY_MS = 250

interface MockUsuario extends UsuarioResponse {
  activo: boolean
}

let nextId = 5
let mockUsuarios: MockUsuario[] = [
  {
    id: 1,
    nombre: 'Juan Pérez',
    email: 'juan@email.com',
    telefono: null,
    roles: ['TURISTA'],
    publicadorId: null,
    activo: true,
  },
  {
    id: 2,
    nombre: 'Carolina Gómez',
    email: 'carolina.turismo@cordoba.gob.ar',
    telefono: '351-5550001',
    roles: ['PUBLICADOR'],
    publicadorId: 1,
    activo: true,
  },
  {
    id: 3,
    nombre: 'Martín Soria',
    email: 'msoria@viajesazo.com',
    telefono: null,
    roles: ['ADMINISTRADOR'],
    publicadorId: null,
    activo: true,
  },
  {
    id: 4,
    nombre: 'Lucía Benítez',
    email: 'lucia.b@gmail.com',
    telefono: null,
    roles: ['TURISTA'],
    publicadorId: null,
    activo: true,
  },
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
  let items = mockUsuarios.filter((u) => u.activo)
  if (rol !== 'TODOS') items = items.filter((u) => u.roles.includes(rol))
  if (q.length > 0) {
    items = items.filter((u) => {
      const haystack = normalize(`${u.nombre} ${u.email}`)
      return haystack.includes(q)
    })
  }
  items.sort((a, b) => b.id - a.id)
  return toPage(
    items.map(({ activo: _activo, ...rest }) => rest),
    page,
    size,
  )
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
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  const q = (filters.q ?? '').trim()
  if (q.length > 0) params.set('q', q)
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
        const created: MockUsuario = {
          id: nextId++,
          nombre: request.nombre.trim(),
          email: request.email.trim(),
          telefono: request.telefono,
          roles: ['TURISTA'],
          publicadorId: null,
          activo: true,
        }
        mockUsuarios = [created, ...mockUsuarios]
        const { activo: _activo, ...response } = created
        return delay(response)
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
    mutationFn: async ({ id, contrasena }: { id: number; contrasena: string }) => {
      if (USE_MOCK) {
        const idx = mockUsuarios.findIndex((u) => u.id === id && u.activo)
        if (idx === -1) throw new ApiError(404, { status: 404, message: 'No existe el usuario' })
        mockUsuarios = mockUsuarios.map((u) => (u.id === id ? { ...u, activo: false } : u))
        const result: BajaUsuarioResponse = {
          id,
          mensaje: 'la cuenta se dio de baja correctamente',
          viajesCancelados: 0,
        }
        return delay(result)
      }
      return apiPost<BajaUsuarioResponse, UsuarioBajaRequest>(
        `/api/usuarios/${id}/baja?confirmar=true`,
        { contrasena },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.usuariosAll() })
    },
  })
}

export function getUsuariosMockState() {
  return { useMock: USE_MOCK }
}

/** Expuesto para tests MSW / demos: busca por email en el mock. */
export function findMockUsuarioByEmail(email: string): UsuarioResponse | undefined {
  const found = mockUsuarios.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.activo)
  if (found === undefined) return undefined
  const { activo: _activo, ...rest } = found
  return rest
}
