/**
 * Access token en memoria (módulo). No se persiste en localStorage/sessionStorage:
 * el refresh HttpOnly en cookie es lo que sobrevive a un reload.
 */
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
