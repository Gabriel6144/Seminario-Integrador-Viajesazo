# Checklist de seguridad — Viajesazo

Documento **vivo**: se puede ir actualizando cuando se agreguen nuevas medidas. Usarlo para corroborar el estado (Hecho / Parcial / Pendiente) antes de un release o revisión de tesis.

> **Alcance:** autenticación, autorización, API y frontend.  
> **Fuera de este checklist:** endurecimiento específico de motor/esquema de base de datos (no se documenta ni cambia aquí la config de datasource).

Última revisión de estados: refuerzos de secretos por env, rate-limit de login, header CSRF en refresh/logout, JWT `iss`/`aud`, filtro con roles desde BD, y mensajes de error FE.

## Cómo usar este archivo

1. Revisar cada fila de la tabla.
2. Al agregar una medida nueva, **añadir una fila** (no borrar historial: marcar Pendiente → Parcial → Hecho).
3. En “Notas”, apuntar archivos o variables de entorno relevantes.
4. Detalle de auth: [`seguridad/AUTH-IMPLEMENTACION.md`](./seguridad/AUTH-IMPLEMENTACION.md) y [`seguridad/AUTENTICACION-Y-AUTORIZACION.md`](./seguridad/AUTENTICACION-Y-AUTORIZACION.md).

## Checklist

| # | Medida | Estado | Dónde / notas |
|---|---|---|---|
| 1 | Guardar claves y secretos en variables de entorno | **Hecho** (con default de desarrollo) | `APP_JWT_SECRET`, `APP_JWT_COOKIE_SECURE`, `APP_JWT_ISSUER`, `APP_JWT_AUDIENCE` vía placeholders en `application.properties`. En producción **obligatorio** setear un secret fuerte y `APP_JWT_COOKIE_SECURE=true`. No hardcodear secrets en el código Java. |
| 2 | Validar y sanitizar en el servidor lo que envía el usuario | **Parcial** | DTOs con `@Valid` + Jakarta Validation; login con `@Size(max=72)` en contraseña. Falta `@Validated` sistemático en path/query en todos los controllers. |
| 3 | Consultas parametrizadas / JPA (anti SQL injection) | **Hecho** | Spring Data JPA + Criteria/Specifications; sin SQL concatenado en `src/main`. |
| 4 | Nunca guardar contraseñas en texto plano (BCrypt) | **Hecho** | `PasswordConfig` + `PasswordEncoder` en alta/login/baja. |
| 5 | Revisar permisos en cada petición (no solo al login) | **Hecho** | `SecurityConfig` (RBAC) + ownership/ABAC en services (`ViajeService`, propuestas, etc.). |
| 6 | Limitar intentos de inicio de sesión | **Hecho** | `LoginRateLimitFilter`: ~10 intentos fallidos / 15 min por IP → 429 genérico. |
| 7 | Forzar HTTPS en producción y cookies HttpOnly / Secure / SameSite | **Parcial** | Cookie refresh: HttpOnly + SameSite=Lax; Secure vía `APP_JWT_COOKIE_SECURE` (false en local). HTTPS/HSTS: responsabilidad del reverse proxy en prod (no forzar HSTS en HTTP local). |
| 8 | No mostrar errores internos al usuario | **Hecho** | BE: `GlobalExceptionHandler` catch-all genérico. FE: `toUserMessage` (incl. planificador/circuito). |
| 9 | Dependencias actualizadas y sin vulnerabilidades | **Parcial** | Lockfiles; script FE `npm run audit:deps`. Revisar advisories (p. ej. Zod/Vite) sin upgrades mayores a ciegas. |
| 10 | Access token corto + refresh token seguro | **Hecho** | Access ~15 min; refresh opaco hasheado (SHA-256), rotación, cookie HttpOnly path `/api/auth`. |
| 11 | Revocar sesiones al cambiar contraseña o dar de baja | **Parcial** | Baja de cuenta → `revokeAllForUsuario`. Cambio/reset de contraseña aún no implementado; al agregarlo debe revocar refresh. |
| 12 | Proteger refresh y logout contra CSRF | **Hecho** | Header obligatorio `X-Viajesazo-CSRF: 1` en `POST /api/auth/refresh` y `/logout` (`AuthCsrfHeaderFilter`). El FE lo envía en `http.ts`. |
| 13 | No loguear tokens, contraseñas ni datos sensibles | **Hecho** (operativo) | Auth no loguea secretos; SQL Hibernate por defecto en WARN (`HIBERNATE_SQL_LOG`). Forgot-password solo loguea id/email. |
| 14 | Validar JWT completo (firma, emisor, audiencia, expiración) | **Hecho** | `JwtService`: firma HS256, `exp`, `iss`, `aud`. Filtro: usuario activo, `sub` = id, **roles desde BD**. |
| 15 | Principio de menor privilegio (roles + ownership) | **Hecho** | Un rol por cuenta en registro; admin/publicador/turista en HTTP; viajes ajenos → 404. |

## Pendiente / próximo

- Completar reset de contraseña (SMTP + token TTL + `POST /reset-password` + página FE) y llamar `revokeAllForUsuario` al cambiar la clave.
- Rate-limit opcional en `forgot-password`.
- CSP en el frontend.
- Upgrades mayores de dependencias con advisories (Zod 4, Vite parches) tras evaluar breaking changes.
- HSTS y TLS terminados en reverse proxy de producción.
- `@Validated` en path variables de todos los controllers.

## Variables de entorno relevantes (backend)

| Variable | Default local | Uso |
|---|---|---|
| `APP_JWT_SECRET` | secret de desarrollo (≥256 bits) | Firma HS256 del access JWT |
| `APP_JWT_COOKIE_SECURE` | `false` | Flag `Secure` de la cookie refresh |
| `APP_JWT_ISSUER` | `viajesazo` | Claim `iss` |
| `APP_JWT_AUDIENCE` | `viajesazo-api` | Claim `aud` |
| `HIBERNATE_SQL_LOG` | `WARN` | Nivel del logger SQL |

## Historial de actualizaciones del checklist

| Fecha | Cambio |
|---|---|
| 2026-11-16 | Creación del checklist + refuerzos (env JWT, rate-limit, CSRF header, iss/aud, roles BD, errores FE, audit script). |
