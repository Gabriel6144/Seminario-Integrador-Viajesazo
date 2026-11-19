# Implementación de autenticación y autorización

Guía para el equipo: qué se agregó, qué cambió y cómo probarlo.
El **contrato** (reglas cerradas y matriz de endpoints) está en
[`AUTENTICACION-Y-AUTORIZACION.md`](./AUTENTICACION-Y-AUTORIZACION.md).

**Stack:** Spring Boot 4.1.1 + Spring Security + JWT (`jjwt`) · React 19 + Vite · auth propia (sin Keycloak/OIDC).

**Estado de verificación (última corrida local):**

| Proyecto | Resultado |
| --- | --- |
| Backend `.\mvnw.cmd clean test` | **301/301** OK |
| Frontend `npm run build` | OK |
| Frontend `npm test` | 163 OK / 36 fallos ajenos al núcleo de auth |

---

## 1. Árbol de archivos

Leyenda: **`[+]`** nuevo · **`[~]`** modificado

### Backend — nuevos

```
turismo-backend/
├── pom.xml                                          [~] spring-security, jjwt, spring-security-test
├── src/main/java/.../turismo_backend/
│   ├── config/
│   │   └── SecurityConfig.java                      [+] cadena de filtros, reglas HTTP, method security
│   ├── controller/
│   │   └── AuthController.java                      [+] login / refresh / logout / me
│   ├── dto/
│   │   ├── request/
│   │   │   ├── LoginRequest.java                    [+]
│   │   │   ├── AsignarRolesRequest.java             [+]
│   │   │   └── VincularPublicadorRequest.java       [+]
│   │   └── response/
│   │       └── AuthTokenResponse.java               [+] access + usuario
│   ├── model/
│   │   ├── Rol.java                                 [+] TURISTA | PUBLICADOR | ADMINISTRADOR
│   │   └── RefreshToken.java                        [+] refresh opaco hasheado
│   ├── repository/
│   │   └── RefreshTokenRepository.java              [+]
│   ├── security/
│   │   ├── JwtService.java                          [+] emitir / validar access JWT
│   │   ├── JwtAuthenticationFilter.java             [+] Bearer → SecurityContext
│   │   ├── RefreshTokenService.java                 [+] create / rotate / revoke
│   │   ├── AuthCookieService.java                   [+] cookie HttpOnly refresh_token
│   │   ├── UsuarioPrincipal.java                    [+] UserDetails del JWT
│   │   ├── UsuarioUserDetailsService.java           [+] carga por id activo
│   │   ├── SecurityUtils.java                       [+] principal / usuarioId actuales
│   │   ├── JsonAuthenticationEntryPoint.java        [+] 401 JSON
│   │   └── JsonAccessDeniedHandler.java             [+] 403 JSON
│   └── service/
│       └── AuthService.java                         [+] login, refresh, logout, me
└── src/test/java/.../
    ├── controller/AuthControllerTest.java           [+]
    ├── service/AuthServiceTest.java                 [+]
    └── security/TestSecuritySupport.java            [+] helper para tests con SecurityContext
```

### Backend — modificados (impacto de seguridad)

```
turismo-backend/src/main/
├── resources/
│   ├── application.properties                       [~] app.jwt.* (secret, TTLs, cookie-secure)
│   └── data.sql                                     [~] usuarios con BCrypt, roles, usuario_id en viajes
├── java/.../
│   ├── model/
│   │   ├── Usuario.java                             [~] roles, vínculo 1:1 a Publicador
│   │   └── Viaje.java                               [~] @ManyToOne Usuario (ownership)
│   ├── dto/request/
│   │   ├── ViajeRequest.java                        [~] sin dueño en el body (lo fija el JWT)
│   │   └── ViajeBorradorRequest.java                [~] idem
│   ├── dto/response/
│   │   ├── UsuarioResponse.java                     [~] roles, publicadorId
│   │   └── ViajeResponse.java                       [~] usuarioId / usuarioEmail
│   ├── mapper/                                      [~] UsuarioMapper, ViajeMapper
│   ├── repository/                                  [~] UsuarioRepository, ViajeRepository
│   ├── controller/
│   │   ├── UsuarioController.java                   [~] PUT roles / publicador
│   │   └── ViajeController.java                     [~] listados sin ?usuario= (principal)
│   ├── service/
│   │   ├── UsuarioService.java                      [~] roles, vínculo, revoca refresh en baja
│   │   ├── ViajeService.java                        [~] ownership → 404
│   │   ├── CircuitoService.java                     [~] ownership del viaje
│   │   ├── PropuestaService.java                    [~] ABAC publicador
│   │   └── ActividadService.java                    [~] ABAC publicador
│   └── exception/GlobalExceptionHandler.java        [~] respuestas alineadas con auth
└── (tests de controllers/services/repos)            [~] SecurityContext / mocks de auth
```

`PasswordConfig` (BCrypt) **ya existía** del registro de usuarios; se reutiliza en el login.

### Frontend — nuevos

```
turismo-frontend/src/
├── api/auth.ts                                      [+] hooks login / logout / refresh / me
├── lib/auth-session.ts                              [+] access token en memoria (módulo)
├── components/
│   ├── auth-provider.tsx                            [+] bootstrap, sesión, hasRole
│   ├── require-auth.tsx                             [+] RequireAuth / RequireRole
│   └── require-auth.test.tsx                        [+]
├── pages/
│   ├── login-page.tsx                               [+]
│   ├── login-page.test.tsx                          [+]
│   └── registro-page.tsx                            [+]
```

### Frontend — modificados

```
turismo-frontend/src/
├── main.tsx                                         [~] envuelve la app con AuthProvider
├── router.tsx                                       [~] guards por sesión y rol
├── lib/http.ts                                      [~] Bearer + credentials + refresh en 401
├── lib/http.test.ts                                 [~]
├── lib/schemas.ts                                   [~] login / registro
├── types/api.ts                                     [~] AuthTokenResponse, roles, etc.
├── api/queries.ts / usuarios.ts / viajes.ts         [~] claves y contratos post-auth
├── components/top-app-bar.tsx / bottom-nav-bar.tsx  [~] login / logout / menú por rol
├── pages/                                           [~] viajes y escrituras asumen sesión
│   borradores, planificador, circuito, eventos,
│   publicadores, usuarios, …
└── test/                                            [~] fixtures, MSW auth, utils con AuthProvider
```

### Documentación

```
docs/seguridad/
├── AUTENTICACION-Y-AUTORIZACION.md                  [+] contrato (reglas y matriz)
└── AUTH-IMPLEMENTACION.md                           [+] este documento
docs/sprint4/PRUEBAS-MANUALES.md                     [~] curls de auth
turismo-backend/AGENTS.md · turismo-frontend/AGENTS.md · README.md  [~]
```

---

## 2. Qué se hizo y por qué

### 2.1 Modelo de datos

**Roles (`Rol`)** — multi-valor en tabla `usuario_roles`:

| Rol | Cómo se obtiene |
| --- | --- |
| `TURISTA` | Registro público (`POST /api/usuarios`) |
| `PUBLICADOR` | Solo admin (`PUT .../roles` + vínculo a `Publicador`) |
| `ADMINISTRADOR` | Seed del primer admin + asignación controlada |

**`Usuario` ↔ `Publicador`** — `@OneToOne` opcional (`publicador_id` único). Si el usuario es `PUBLICADOR`, el vínculo es obligatorio: así el ABAC sabe *qué* publicaciones puede editar.

**`Viaje` ↔ `Usuario`** — `@ManyToOne` obligatorio (`usuario_id`). El dueño **no** viaja en el JSON de alta: lo setea el service desde el JWT. Así no se puede crear un viaje “a nombre de otro”.

**`RefreshToken`** — valor opaco (UUID) guardado como **hash SHA-256**; el valor en claro solo sale en la cookie. Campos útiles: `expiresAt`, `revoked`, `userAgent`, `ipAddress`.

### 2.2 Spring Security + JWT + refresh cookie

```
Request → JwtAuthenticationFilter → SecurityFilterChain (authorizeHttpRequests)
                ↓
         SecurityContext (UsuarioPrincipal)
```

- **Stateless:** sin sesión HTTP de servidor (`SessionCreationPolicy.STATELESS`).
- **Access JWT (corto, ~15 min):** claims `sub` (id), `email`, `roles[]`. Va en `Authorization: Bearer …`. Vive **solo en memoria** del SPA.
- **Refresh opaco (largo, ~14 días):** cookie `refresh_token`, `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`. En cada refresh se **rota** (revoca el anterior y emite uno nuevo).
- **CSRF deshabilitado** a propósito: no hay cookies de sesión mutables fuera del path de auth; el access no va en cookie.
- **401/403 en JSON** (`JsonAuthenticationEntryPoint` / `JsonAccessDeniedHandler`), mismo estilo que el resto de la API.

Config relevante (`application.properties`):

```properties
app.jwt.secret=…                 # ≥256 bits para HS256 (cambiar en prod)
app.jwt.access-token-minutes=15
app.jwt.refresh-token-days=14
app.jwt.cookie-secure=false      # true detrás de HTTPS en producción
```

### 2.3 Endpoints de autenticación

| Método | Ruta | Auth | Qué hace |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Público | Valida email+password → access + `Set-Cookie` refresh |
| `POST` | `/api/auth/refresh` | Cookie | Rota refresh → nuevo access (+ cookie nueva) |
| `POST` | `/api/auth/logout` | Cookie (opcional) | Revoca refresh + limpia cookie → **204** |
| `POST` | `/api/auth/forgot-password` | Público | Solicita recuperación → **204** siempre (anti-enumeración; mail stub) |
| `GET` | `/api/auth/me` | Bearer | Usuario activo del principal |

Relacionados (usuarios):

| Método | Ruta | Quién |
| --- | --- | --- |
| `POST` | `/api/usuarios` | Público → siempre `TURISTA` |
| `GET` | `/api/usuarios/{id}` | Propio o admin |
| `POST` | `/api/usuarios/{id}/baja` | Propio (+ contraseña); revoca refreshes |
| `PUT` | `/api/usuarios/{id}/roles` | Solo admin |
| `PUT` | `/api/usuarios/{id}/publicador` | Solo admin |

Cuerpo típico de login/refresh:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 900,
  "usuario": { "id": 1, "nombre": "…", "email": "…", "roles": ["TURISTA"], "publicadorId": null }
}
```

### 2.4 Autorización: RBAC + ABAC + ownership

**RBAC (rol en la cadena HTTP)** — `SecurityConfig`:

- Lecturas de catálogo (`GET` eventos, agenda, propuestas, publicadores, archivos): **públicas**.
- Escritura de eventos/actividades/imágenes: `PUBLICADOR` o `ADMINISTRADOR`.
- Alta de publicadores y asignación de roles/vínculo: solo `ADMINISTRADOR`.
- Viajes y `/api/auth/me`: autenticado.

**ABAC (atributo del recurso)** — en services:

- **Evento / actividad:** admin puede todo; publicador solo si `propuesta.publicador.id == principal.publicadorId`.
- **Viaje (+ circuitos):** `viaje.usuario.id == principal.id`. **Sin bypass de admin** (privacidad del itinerario). Recurso ajeno → **404** (anti-enumeración), no 403.

### 2.5 Frontend

| Pieza | Rol |
| --- | --- |
| `auth-session.ts` | Access token en variable de módulo (no `localStorage`) |
| `http.ts` | `credentials: 'include'` + `Authorization` + **single-flight refresh** ante 401 |
| `AuthProvider` | Al montar intenta `POST /api/auth/refresh`; expone `login` / `logout` / `hasRole` |
| `RequireAuth` / `RequireRole` / `RequireNotAdmin` | Guards: sesión, rol y shell admin exclusivo |
| `/login`, `/registro` | UI de entrada; redirect con `?next=` |
| `/admin` | Dashboard de métricas (solo `ADMINISTRADOR`) |
| `/publicador` | Panel del publicador (métricas solo del publicador vinculado a la sesión) |
| Top / bottom bar | Entrar / salir y links según rol (admin no ve catálogo; publicador sin Inscriptos) |

Rutas protegidas (resumen): `borradores`, `planificar`, circuitos → sesión; alta/edición de propuestas + panel/agenda → `PUBLICADOR`; dashboard admin, usuarios y alta de publicadores → `ADMINISTRADOR`. El admin no entra a catálogo/viajes (`RequireNotAdmin` / `HomeEntry`).

Endpoints de métricas:

| Método | Ruta | Quién | Qué hace |
| --- | --- | --- | --- |
| `GET` | `/api/admin/dashboard` | `ADMINISTRADOR` | Totales, activos/nuevos 7/30d, proporción roles, viajes, top propuestas |
| `GET` | `/api/publicador/dashboard` | `PUBLICADOR` | Totales de propuestas propias del publicador vinculado al JWT |

---

## 3. Flujo completo

```
┌─────────────┐     POST /api/usuarios      ┌─────────────┐
│  Registro   │ ───────────────────────────►│  TURISTA    │
│  (público)  │                             │  (BCrypt)   │
└─────────────┘                             └──────┬──────┘
                                                   │
┌─────────────┐     POST /api/auth/login           │
│   Login     │ ◄──────────────────────────────────┘
│             │     body: access JWT
│             │     Set-Cookie: refresh_token
└──────┬──────┘
       │
       │  Authorization: Bearer <access>
       ▼
┌─────────────┐     GET/POST/PUT /api/...   ┌─────────────┐
│  Request    │ ───────────────────────────►│  Filter JWT │
│  autenticada│                             │  + RBAC/ABAC│
└──────┬──────┘                             └─────────────┘
       │
       │  401 (access vencido)
       ▼
┌─────────────┐     POST /api/auth/refresh (cookie)
│  Refresh    │ ──► nuevo access + rotación cookie
│  (SPA auto) │
└──────┬──────┘
       │
       │  logout o baja de cuenta
       ▼
┌─────────────┐     POST /api/auth/logout
│  Logout     │ ──► revoca refresh, limpia cookie, borra access en memoria
└─────────────┘
```

Tras un **F5**, el access se pierde (está en memoria). `AuthProvider` llama a `/api/auth/refresh` con la cookie y restaura la sesión sin pedir password otra vez.

---

## 4. Cómo levantar y probar

### Levantar

```powershell
# Terminal 1 — API (puerto 8080)
cd turismo-backend
.\mvnw.cmd spring-boot:run

# Terminal 2 — SPA (puerto 5173, proxy /api → 8080)
cd turismo-frontend
npm run dev
```

Abrir `http://localhost:5173/login`.

### Credenciales de demo (solo H2 seed / desarrollo)

| Email | Contraseña | Roles |
| --- | --- | --- |
| `admin@viajesazo.com` | `Admin123!` | `ADMINISTRADOR`, `TURISTA` |
| `publicador.demo@viajesazo.com` | `Turista123!` | `PUBLICADOR` (Turismo Córdoba) |
| `publicador.cosquin@viajesazo.com` | `Turista123!` | `PUBLICADOR` (Municipalidad de Cosquín) |
| `turista.demo@viajesazo.com` | `Turista123!` | `TURISTA` |

Más cuentas en el contrato. **No** publicarlas en el README público.

Checklist por rol (UI):

1. **Admin** → login → `/admin` (métricas) y `/usuarios`; ir a `/` o `/agenda` redirige a `/admin`.
2. **Publicador** → ve Propuestas/Agenda/Publicadores + **Inscriptos**; `/usuarios` y `/admin` redirigen al inicio.
3. **Turista** → catálogo y viajes; sin Inscriptos ni Usuarios ni Dashboard.

### Smoke con curl (PowerShell)

```powershell
# Login → guarda cookie
curl.exe -s -i -c cookies.txt -X POST http://localhost:8080/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"turista.demo@viajesazo.com\",\"contrasena\":\"Turista123!\"}"

# Copiar accessToken del JSON y usarlo:
curl.exe -s -H "Authorization: Bearer <ACCESS>" http://localhost:8080/api/auth/me
curl.exe -s -H "Authorization: Bearer <ACCESS>" http://localhost:8080/api/viajes

# Refresh (rota cookie)
curl.exe -s -i -b cookies.txt -c cookies.txt -X POST http://localhost:8080/api/auth/refresh

# Logout
curl.exe -s -i -b cookies.txt -X POST http://localhost:8080/api/auth/logout
```

### Checklist manual rápido (UI)

1. Registro → login → ver “Mis viajes”.
2. Sin sesión, `/planificar` redirige a `/login?next=…`.
3. F5 con sesión: sigue autenticado (refresh).
4. Logout: cookie limpia; `/api/viajes` sin Bearer → 401.
5. Turista no ve / no entra a alta de publicador ni a usuarios.
6. Viaje de otro usuario (API) → **404**.

### Tests automatizados

```powershell
cd turismo-backend
.\mvnw.cmd clean test          # importante: siempre con clean

cd ..\turismo-frontend
npm test
npm run build
```

---

## 5. Decisiones técnicas y limitaciones

### Decisiones

| Decisión | Motivo |
| --- | --- |
| Access en memoria, refresh en cookie HttpOnly | Mitiga XSS sobre el token de larga duración |
| Rotación de refresh | Reduce ventana si se filtra una cookie |
| Viaje ajeno → 404 (sin bypass admin) | Anti-enumeración + privacidad del itinerario |
| Registro solo `TURISTA` | Escalada de privilegios solo por admin |
| Lecturas de catálogo públicas | Agenda/turismo consultable sin cuenta |
| Sin Flyway (todavía) | H2 `create-drop` + `data.sql`; schema = entidades |
| Auth propia (no OIDC) | Alcance de tesis / demo controlable |

### Limitaciones conocidas

- **Secret JWT y `cookie-secure=false`** son de desarrollo. En producción: secret fuerte (env/secret manager), HTTPS y `app.jwt.cookie-secure=true`.
- **Sin CORS en el backend de prod** más allá de defaults: en local alcanza el proxy de Vite; en deploy hace falta reverse proxy o CORS explícito.
- **H2 en memoria:** cada reinicio borra datos; el seed vuelve a crear usuarios/viajes.
- **Enumeración de emails** en registro/login de publicadores/usuarios (mensajes de duplicado): aceptado por ahora; mejorar a respuestas genéricas si hace falta.
- **Tests FE:** hay fallos preexistentes / de fixtures en páginas de eventos, imágenes multipart, etc.; el núcleo de auth (login, guards, http refresh) y el backend completo están en verde.
- **Perfil de usuario editable** y flujos OIDC quedan fuera de este alcance.

### Recuperación de contraseña (pendiente de mail)

Endpoint listo y público: `POST /api/auth/forgot-password` con body `{ "email": "..." }`. Responde **204** siempre que el email sea válido (exista o no la cuenta). Si el usuario está activo, `PasswordResetMailer` solo deja un log INFO: el envío real **no está configurado**.

En la UI de login hay link “¿Olvidó su contraseña?” y mensaje genérico de confirmación.

**Falta para cerrar el flujo:**

1. Dependencia `spring-boot-starter-mail` + propiedades SMTP (`spring.mail.*`).
2. Generación y persistencia de un token de reset con TTL (entidad/tabla).
3. `POST /api/auth/reset-password` (token + nueva contraseña).
4. Página FE que reciba el token (query) y permita elegir nueva contraseña.
5. Plantilla de mail con link absoluto al front.
6. Rate limiting opcional sobre `forgot-password` para abuso.

### Dónde mirar si algo falla

| Síntoma | Revisar |
| --- | --- |
| 401 en todo | Cookie path `/api/auth`, `credentials: 'include'`, proxy Vite |
| 403 en escritura | Rol del JWT vs `SecurityConfig` |
| 404 en “mi viaje” | Ownership / viaje de otro usuario o cancelado |
| Login OK pero F5 pierde sesión | Refresh / cookie Secure en HTTP |
| Tests backend raros | Correr **`clean test`**, no `test` solo |

---

## Referencias rápidas

- Checklist vivo (Hecho / Parcial / Pendiente): [`../CHECKLIST-SEGURIDAD.md`](../CHECKLIST-SEGURIDAD.md)
- Contrato: [`AUTENTICACION-Y-AUTORIZACION.md`](./AUTENTICACION-Y-AUTORIZACION.md)
- Curls: [`../sprint4/PRUEBAS-MANUALES.md`](../sprint4/PRUEBAS-MANUALES.md) (sección auth)
- Backend: `turismo-backend/AGENTS.md` · Frontend: `turismo-frontend/AGENTS.md`

### CSRF en refresh / logout

`POST /api/auth/refresh` y `POST /api/auth/logout` exigen el header `X-Viajesazo-CSRF: 1` (el frontend lo envía desde `http.ts`). Sin el header → 403. Mitiga CSRF clásico sobre la cookie HttpOnly cuando Spring CSRF está deshabilitado.
