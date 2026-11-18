import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { clearAccessToken, setAccessToken } from '@/lib/auth-session'
import { apiGet, apiPost } from '@/lib/http'
import type {
  AuthTokenResponse,
  ForgotPasswordRequest,
  LoginRequest,
  UsuarioResponse,
} from '@/types/api'

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: LoginRequest) =>
      apiPost<AuthTokenResponse, LoginRequest>('/api/auth/login', request),
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      queryClient.setQueryData(queryKeys.me(), data.usuario)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiPost<null, undefined>('/api/auth/logout', undefined),
    onSettled: () => {
      clearAccessToken()
      queryClient.setQueryData(queryKeys.me(), null)
      void queryClient.removeQueries({ queryKey: queryKeys.me() })
    },
  })
}

export function useRefresh() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiPost<AuthTokenResponse, undefined>('/api/auth/refresh', undefined),
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      queryClient.setQueryData(queryKeys.me(), data.usuario)
    },
    onError: () => {
      clearAccessToken()
      queryClient.setQueryData(queryKeys.me(), null)
    },
  })
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: ({ signal }) => apiGet<UsuarioResponse>('/api/auth/me', signal),
    enabled,
    retry: false,
  })
}

/**
 * `POST /api/auth/forgot-password` — solicita recuperación.
 * El backend responde 204 siempre (anti-enumeración); el mail real aún no está configurado.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (request: ForgotPasswordRequest) =>
      apiPost<null, ForgotPasswordRequest>('/api/auth/forgot-password', request),
  })
}
