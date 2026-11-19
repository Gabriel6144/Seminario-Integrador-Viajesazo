# Autenticación y autorización (JWT + RBAC/ABAC)

> Contrato de seguridad del monorepo. Auth propia (email + password), sin Keycloak ni OIDC.
> Stack: Spring Boot 4.1.1 / Java 17 (JDK 21 OK) + React 19 / Vite.

## Decisiones cerradas

| Tema | Decisión |
| --- | --- |
| AuthN | Email + password; BCrypt; access JWT corto; refresh opaco en cookie `HttpOnly` |
| Cookie refresh | Nombre `refresh_token`; path `/api/auth`; SameSite=Lax; Secure en prod |
| Access token | Solo en memoria del SPA (no `localStorage`); al F5 se restaura con `POST /api/auth/refresh` + `credentials: 'include'` |
| Roles | **Un rol por cuenta**: `TURISTA`, `PUBLICADOR` o `ADMINISTRADOR` |
| Registro público | Elige `TURISTA` o `PUBLICADOR` (nunca `ADMINISTRADOR`). Si elige PUBLICADOR se crea y vincula un `Publicador` con nombre/email/teléfono de la cuenta |
| ADMIN | Solo por procedimiento controlado (seed / admin autenticado) |
| PUBLICADOR | Debe estar vinculado 1:1 a un `Publicador`; solo gestiona sus publicaciones |
| Viajes | Solo el propietario; **sin** bypass de `ADMINISTRADOR` |
| Viaje ajeno | Responder **404** (anti-enumeración) |
| Catálogo GET | Agenda/eventos/propuestas/publicadores en lectura: **públicos**; escrituras protegidas |
| Agenda publicador | Eventos **y** actividades con `fechaInicio`/`fechaFin`; un publicador no puede solapar rangos propios |
| Migraciones | Sin Flyway mientras `ddl-auto=create-drop`; cambios en entidades + `data.sql` |

## Matriz de endpoints

| Área | Regla |
| --- | --- |
| `POST /api/usuarios` | Público (registro → `TURISTA` o `PUBLICADOR`) |
| `POST /api/auth/login`, `/refresh`, `/logout` | Público |
| `GET /api/auth/me` | Autenticado |
| `GET /api/usuarios/{id}` | Propio o `ADMINISTRADOR` |
| `POST /api/usuarios/{id}/baja` | Propio (contraseña) |
| `PUT` roles y vínculo publicador | Solo `ADMINISTRADOR` (un rol) |
| `POST` publicadores | Solo `ADMINISTRADOR` |
| `POST/PUT/DELETE` eventos, actividades, imágenes | `PUBLICADOR` (ABAC) o `ADMINISTRADOR` (TURISTA no escribe) |
| `POST`/`DELETE` `/api/propuestas/{id}/me-gusta` | Solo `TURISTA` (like sobre evento o actividad) |
| `GET` `/api/propuestas/{id}/me-gusta` | Autenticado (`meGusta` solo true para el turista que ya dio like) |
| Lecturas catálogo (`GET` agenda, eventos, propuestas, publicadores, archivos) | Públicas |
| Viajes y circuitos | Autenticado + ownership del viaje (ni admin) |
| `GET /api/admin/dashboard` | Solo `ADMINISTRADOR` |
| `GET /api/publicador/**` (`dashboard`, `agenda`, `fechas-ocupadas`) | Solo `PUBLICADOR` (datos del publicador vinculado al JWT) |
| `GET /api/usuarios` | Solo `ADMINISTRADOR` |

## Shell de UI por rol

| Rol | Vistas permitidas (SPA) |
| --- | --- |
| `TURISTA` | Propuestas (detalle + Me gusta; sin editar/dar de baja), Agenda turística, Publicadores, Planificar, Mis viajes |
| `PUBLICADOR` | **Propuestas** propias (`GET /api/propuestas?publicadorId=`), Publicadores, **Panel** (`/publicador`, métricas solo del publicador vinculado), **Mi agenda** (`/publicador/agenda`). Sin Inscriptos / Agenda turística / Planificar / Mis viajes |
| `ADMINISTRADOR` | Shell exclusivo: **Dashboard** (`/admin`) + **Usuarios** (`/usuarios`) |

Las pantallas turísticas existentes no se reescriben: solo se agregan rutas nuevas y guards.

## Credenciales de demo (solo desarrollo / H2 seed)

| Email | Contraseña | Roles |
| --- | --- | --- |
| `admin@viajesazo.com` | `Admin123!` | `ADMINISTRADOR` |
| `publicador.demo@viajesazo.com` | `Turista123!` | `PUBLICADOR` (vinculado a Turismo Córdoba) |
| `publicador.cosquin@viajesazo.com` | `Turista123!` | `PUBLICADOR` (vinculado a Municipalidad de Cosquín) |
| `turista.demo@viajesazo.com` | `Turista123!` | `TURISTA` |
| `turista.aventura@viajesazo.com` | `Turista123!` | `TURISTA` |
| `turista.gastronomico@viajesazo.com` | `Turista123!` | `TURISTA` |
| `familia.demo@viajesazo.com` | `Turista123!` | `TURISTA` |

No publicar estas contraseñas en el README raíz.

## Procedimiento controlado de roles

1. **Primer admin:** seed en `data.sql` (email y hash BCrypt). Credenciales de demo solo en esta carpeta / `PRUEBAS-MANUALES`, no en el README público.
2. Un `ADMINISTRADOR` autenticado llama:
   - `PUT /api/usuarios/{id}/roles` — body `{ "rol": "TURISTA" | "PUBLICADOR" | "ADMINISTRADOR" }` (un solo rol).
   - `PUT /api/usuarios/{id}/publicador` — link a `publicadorId` (deja el rol único en `PUBLICADOR`).
3. Al quitar `PUBLICADOR`, se desvincula el `publicador_id`.
4. Un usuario no puede asignarse a sí mismo `ADMINISTRADOR` ni `PUBLICADOR` por la API pública de registro (salvo elegir PUBLICADOR en el alta, que crea el vínculo automáticamente).

## Ownership (ABAC)

| Recurso | Regla |
| --- | --- |
| Viaje (+ circuitos anidados) | `viaje.usuario.id == principal.id` — **sin** excepción admin |
| Evento / actividad (escritura) | Admin **o** (`PUBLICADOR` y `propuesta.publicador.id == principal.publicadorId`) |

## Flujo de tokens

1. Login → access JWT en body + `Set-Cookie: refresh_token=...`
2. Requests → `Authorization: Bearer <access>`
3. Access expirado → SPA hace `POST /api/auth/refresh` (cookie) → nuevo access + rotación de refresh
4. Logout / baja → revoca refresh y limpia cookie

Claims del access: `sub` = id de usuario, `email`, `roles[]` (tamaño 1).
