import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { clearAccessToken, setAccessToken } from '@/lib/auth-session'
import { apiPost } from '@/lib/http'
import type { AuthTokenResponse, LoginRequest, RolUsuario, UsuarioResponse } from '@/types/api'

interface AuthContextValue {
  user: UsuarioResponse | null
  roles: RolUsuario[]
  isAuthenticated: boolean
  /** `true` hasta que termina el bootstrap (refresh al montar). */
  isBootstrapping: boolean
  login: (request: LoginRequest) => Promise<UsuarioResponse>
  logout: () => Promise<void>
  hasRole: (...roles: RolUsuario[]) => boolean
  setUser: (user: UsuarioResponse | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  /** Solo tests: sesión ya iniciada sin pasar por refresh. */
  initialUser?: UsuarioResponse | null
  /** Solo tests: no llamar a `/api/auth/refresh` al montar. */
  skipBootstrap?: boolean
}

export function AuthProvider({
  children,
  initialUser = null,
  skipBootstrap = false,
}: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<UsuarioResponse | null>(initialUser)
  const [isBootstrapping, setIsBootstrapping] = useState(!skipBootstrap)

  useEffect(() => {
    if (skipBootstrap) {
      setIsBootstrapping(false)
      return
    }

    let cancelled = false

    async function bootstrap() {
      try {
        const data = await apiPost<AuthTokenResponse, undefined>('/api/auth/refresh', undefined)
        if (cancelled) return
        setAccessToken(data.accessToken)
        setUser(data.usuario)
        queryClient.setQueryData(queryKeys.me(), data.usuario)
      } catch {
        if (cancelled) return
        clearAccessToken()
        setUser(null)
        queryClient.setQueryData(queryKeys.me(), null)
      } finally {
        if (!cancelled) setIsBootstrapping(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [queryClient, skipBootstrap])

  const login = useCallback(
    async (request: LoginRequest) => {
      const data = await apiPost<AuthTokenResponse, LoginRequest>('/api/auth/login', request)
      setAccessToken(data.accessToken)
      setUser(data.usuario)
      queryClient.setQueryData(queryKeys.me(), data.usuario)
      return data.usuario
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    try {
      await apiPost<null, undefined>('/api/auth/logout', undefined)
    } finally {
      clearAccessToken()
      setUser(null)
      queryClient.setQueryData(queryKeys.me(), null)
      void queryClient.removeQueries({ queryKey: queryKeys.me() })
    }
  }, [queryClient])

  const hasRole = useCallback(
    (...roles: RolUsuario[]) => {
      if (user === null) return false
      return roles.some((role) => user.roles.includes(role))
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles: user?.roles ?? [],
      isAuthenticated: user !== null,
      isBootstrapping,
      login,
      logout,
      hasRole,
      setUser,
    }),
    [user, isBootstrapping, login, logout, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
