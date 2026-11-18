# Checklist de seguridad — Viajesazo

Documento **vivo**: se va actualizando a medida que se agregan medidas. Usarlo para corroborar el estado (Hecho / Parcial / Pendiente) antes de un release o de la revisión de tesis.

> **Alcance:** autenticación, autorización, API y frontend.
> **Fuera de este checklist:** endurecimiento específico del motor/esquema de base de datos (no se documenta ni se cambia acá la config de datasource).

Última revisión de estados: **2026-11-18**, contra el **código real** (`turismo-backend/src/main`, `turismo-frontend/src`), no solo contra la documentación. Cada fila indica archivo y, cuando aplica, línea.

---

## Fuente de verdad (sin ambigüedad)

| Tema | Fuente de verdad | Verificado contra el código |
|---|---|---|
| Credenciales de demo, roles por cuenta, matriz de endpoints, reglas de registro | [`AUTENTICACION-Y-AUTORIZACION.md`](./AUTENTICACION-Y-AUTORIZACION.md) | Sí. Las 7 cuentas y contraseñas del contrato coinciden con los hashes BCrypt de `data.sql`. |
| Detalle de implementación y forma de probar | [`AUTH-IMPLEMENTACION.md`](./AUTH-IMPLEMENTACION.md) | **Parcialmente desactualizado**: ver "Discrepancias documentales". Si contradice al contrato, **manda el contrato**. |
| Estado de las medidas | Este archivo | Sí (2026-11-18) |

**Reglas confirmadas en código** (no hay otra interpretación válida):

- **Un rol por cuenta.** La tabla `usuario_roles` técnicamente admite varios, pero `UsuarioService.create`, `assignRoles` y `linkPublicador` siempre guardan **exactamente uno** (`Set.of(rol)`).
- **Registro público (`POST /api/usuarios`):** acepta `TURISTA` o `PUBLICADOR`, nunca `ADMINISTRADOR` (`UsuarioService.create`). Si es `PUBLICADOR`, crea y vincula un `Publicador` con nombre/email/teléfono de la cuenta, **sin aprobación**.
- **Seed:** `admin@viajesazo.com` tiene **solo** `ADMINISTRADOR` (`data.sql`, `usuario_roles`). Las contraseñas válidas son las del contrato.
- **Viajes y circuitos:** solo el dueño, sin bypass de admin; un recurso ajeno responde **404** (`ViajeService`, `CircuitoService`).
- **Refresh y logout:** son públicos a nivel de rol, pero **exigen** el header `X-Viajesazo-CSRF: 1` (`AuthCsrfHeaderFilter`); sin él → 403.

> No copiar contraseñas de demo en este archivo ni en el README: viven solo en el contrato.

---

## Cómo usar este archivo

1. Revisar cada fila de la tabla.
2. Al agregar una medida nueva, **añadir una fila** (no borrar historial: marcar Pendiente → Parcial → Hecho).
3. En "Dónde / notas", apuntar archivos, líneas o variables de entorno relevantes.
4. **Prioridad:** 🔴 Crítico (antes de cualquier deploy o demo pública) · 🟠 Alto · 🟡 Medio · 🟢 Bajo.
5. Rutas de código abreviadas: `BE/` = `turismo-backend/src/main/java/com/viajesazo/turismo_backend/`, `FE/` = `turismo-frontend/src/`.

---

## Checklist — medidas existentes (revisadas)

| # | Medida | Estado | Prioridad | Dónde / notas |
|---|---|---|---|---|
| 1 | Guardar claves y secretos en variables de entorno | **Parcial** (antes: Hecho) | 🔴 | ✔ Placeholders `APP_JWT_*` en `application.properties`. ✔ `Keys.hmacShaKeyFor` (`BE/security/JwtService.java:31`) impide arrancar con un secret de menos de 256 bits. ✘ El default `change-me-viajesazo-dev-secret-...` (`application.properties:70`) **está en el repo** y la app arranca con él si falta `APP_JWT_SECRET`. Con ese secret se puede firmar un token válido con `sub`/`email` de cualquier usuario, admin incluido. Falta el fail-fast → **#16**. |
| 2 | Validar y sanitizar en el servidor lo que envía el usuario | **Parcial** | 🟡 | ✔ `@Valid` en los DTOs; `UsuarioRequest` con `@Size` (nombre 120, email 180, teléfono 40, contraseña 8–72). ✘ Sin `@Size` en `EventoRequest`/`ActividadRequest` (`descripcion`, `lugarRecinto`, `direccion`, etc.) ni en `PublicadorRequest`. ✘ `imagenes` acepta cualquier string/URL → **#30**. ✘ Falta `@Validated` en path/query de todos los controllers. ✘ Email sin normalizar → **#44**. |
| 3 | Consultas parametrizadas / JPA (anti SQL injection) | **Hecho** | — | Verificado: JPQL con `:param` (`BE/repository/UsuarioRepository.java`), Criteria en `PropuestaSpecifications`, sin SQL nativo concatenado. Nota menor: `%` y `_` del usuario no se escapan en los `LIKE` (no es inyección; solo afecta los resultados). |
| 4 | Nunca guardar contraseñas en texto plano (BCrypt) | **Hecho** | — | `BE/config/PasswordConfig.java` (`BCryptPasswordEncoder`, cost 10). En registro: 8–72 caracteres + tope de **72 bytes** (`UsuarioService.create`). Login sin el chequeo de bytes → **#27**. |
| 5 | Revisar permisos en cada petición (no solo al login) | **Hecho** (con excepción) | 🟠 | ✔ RBAC en `BE/config/SecurityConfig.java:81-116` + `anyRequest().authenticated()`. ✔ ABAC en `PropuestaService`/`ActividadService`: para un PUBLICADOR se **ignora** el `publicadorId` del body y se usa el del principal. ✔ Ownership en `ViajeService`, `CircuitoService`, `NotificacionService` (`findByIdAndUsuarioId`), `UsuarioService` (`assertSelf`/`assertSelfOrAdmin`). ✘ **Excepción:** `DELETE /api/imagenes/{nombre}` sin ownership → **#28**. ✘ Sin tests de matriz → **#38**. |
| 6 | Limitar intentos de inicio de sesión | **Parcial** (antes: Hecho) | 🟠 | `BE/security/LoginRateLimitFilter.java`: 10 fallos / 15 min por IP, en memoria. ✘ **Se puede saltear**: `clientIp()` (línea 78) usa el primer valor de `X-Forwarded-For` sin validarlo, así que un atacante manda un valor distinto en cada request. ✘ No limita por cuenta. ✘ Cuenta como fallo cualquier 4xx (incluidos los 400 de validación). → **#19**. |
| 7 | Forzar HTTPS en producción y cookies HttpOnly / Secure / SameSite | **Parcial** | 🔴 (en deploy) | `BE/security/AuthCookieService.java`: `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`, `Max-Age` 14 días. `Secure` depende de `APP_JWT_COOKIE_SECURE` (**default `false`**). Spring agrega HSTS solo en requests HTTPS. Falta: fail-fast si `cookie-secure=false` fuera de dev (**#16**), TLS en el proxy (**#35**), prefijo `__Secure-` (**#43**). |
| 8 | No mostrar errores internos al usuario | **Hecho** | — | `BE/exception/GlobalExceptionHandler.java:210`: el catch-all loguea el stack y responde un mensaje genérico. Los 4xx devuelven mensajes de negocio. FE: `toUserMessage` en `FE/lib/http.ts`. Detalle menor → **#46**. |
| 9 | Dependencias actualizadas y sin vulnerabilidades | **Parcial** | 🟡 | FE: lockfile + `npm run audit:deps` (**`--omit=dev`**: no audita vite/vitest). BE: **sin escaneo**. → **#36**, **#37**. |
| 10 | Access token corto + refresh token seguro | **Parcial** (antes: Hecho) | 🟠 | ✔ Access de 15 min. ✔ Refresh UUID v4 opaco, guardado como SHA-256, rotación (`BE/security/RefreshTokenService.java:52`). ✘ **Sin detección de reuso**: presentar un refresh ya rotado solo da "inválido" y no revoca la familia → **#22**. ✘ **Sin vida máxima absoluta**: cada rotación da 14 días nuevos, así que la sesión puede ser infinita → **#23**. ✘ Los tokens vencidos/revocados nunca se borran → **#23**. |
| 11 | Revocar sesiones al cambiar contraseña o dar de baja | **Parcial** | 🟠 | ✔ Baja → `revokeAllForUsuario`. ✔ El filtro JWT exige usuario activo (`findByEmailAndActivoTrue`), así que la baja corta también el access vigente. ✔ Los roles se leen de la BD en cada request: un cambio de rol aplica al instante. ✘ No existe cambio/reset de contraseña (cuando exista, debe llamar a `revokeAllForUsuario`). ✘ Sin revocación por admin ni "cerrar todas mis sesiones" → **#24**. Riesgo aceptado: el logout no invalida el access vigente (≤15 min). |
| 12 | Proteger refresh y logout contra CSRF | **Hecho** (con un supuesto) | 🟠 | `BE/security/AuthCsrfHeaderFilter.java` exige `X-Viajesazo-CSRF: 1` en `POST /api/auth/refresh` y `/logout` (403 si falta); el FE lo envía (`FE/lib/http.ts:55`). **Supuesto que hay que mantener:** sin CORS habilitado (hoy `.cors(withDefaults())` sin `CorsConfigurationSource` → ningún origen externo). Si se configura CORS con credenciales y origen `*` o reflejado, esta defensa deja de servir → **#34**. No protege frente a XSS. |
| 13 | No loguear tokens, contraseñas ni datos sensibles | **Parcial** (antes: Hecho) | 🟡 | ✔ Auth no loguea contraseñas ni tokens; SQL de Hibernate en `WARN`. ✘ `BE/security/PasswordResetMailer.java:19` **loguea el email** (dato personal) → loguear solo `usuarioId`. ✘ `refresh_token` guarda `userAgent`/`ipAddress` sin política de retención → **#40**. |
| 14 | Validar JWT completo (firma, emisor, audiencia, expiración) | **Hecho** | — | `BE/security/JwtService.java:59`: `verifyWith(secretKey)` (solo HMAC; rechaza `alg: none`), `requireIssuer`, `requireAudience`, `exp`. Filtro (`JwtAuthenticationFilter`): busca el usuario activo por el email del token, exige `sub == id` y toma las authorities de la BD. **Corrección:** el algoritmo no es fijo HS256; jjwt lo elige según el largo del secret (32–47 bytes HS256, 48–63 HS384, ≥64 HS512). Con el default actual (66 bytes) firma **HS512**. Sin `jti`/`kid` → **#17**. |
| 15 | Principio de menor privilegio (roles + ownership) | **Parcial** (antes: Hecho) | 🟠 | ✔ Un rol por cuenta; ADMIN nunca por registro; `PUT /roles` y `/publicador` solo ADMIN. ✘ **Cualquiera puede registrarse como PUBLICADOR y publicar en el catálogo** sin aprobación → **#41**. ✘ `GET /api/publicadores` expone datos de contacto → **#31**. ✘ Un admin puede quitarse su propio rol (no se protege al último ADMIN) → **#42**. ✘ Sin auditoría de cambios de rol → **#33**. |

---

## Checklist — medidas nuevas a implementar

| # | Medida | Estado | Prioridad | Dónde / notas |
|---|---|---|---|---|
| 16 | **Fail-fast de configuración sensible**: fuera del perfil `dev`, abortar el arranque si `APP_JWT_SECRET` falta o es el default, o si `APP_JWT_COOKIE_SECURE=false` | Pendiente | 🔴 | Validar en `JwtService`/`AuthCookieService` o con `@ConfigurationProperties` + `@Validated`. Cierra el hueco de #1 y #7. |
| 17 | Procedimiento de rotación del secret JWT | Pendiente | 🟡 | Opción A: `kid` en el header + dos claves válidas durante la transición. Opción B (aceptable en tesis): rotar = todos vuelven a loguearse; documentarlo. |
| 18 | **Seed de demo solo en perfil `dev`** | Pendiente | 🔴 | Hoy `spring.sql.init.mode=always` + `data.sql` cargan en **cualquier entorno** las 7 cuentas con las contraseñas conocidas del contrato. Pasar el seed a `application-dev.properties` y crear el admin de prod por variable de entorno. |
| 19 | Rate limit de login con IP real confiable + límite por cuenta | Pendiente | 🟠 | Usar `request.getRemoteAddr()` + `server.forward-headers-strategy=native` detrás de un proxy de confianza (no leer `X-Forwarded-For` a mano). Agregar contador por email. Contar solo las credenciales inválidas, no cualquier 4xx. Tope de entradas en el mapa. |
| 20 | Rate limit en otros endpoints sensibles | Pendiente | 🟠 | `POST /api/auth/forgot-password` (bombardeo de mails cuando haya SMTP), `POST /api/usuarios` (alta masiva de cuentas/publicadores), `POST /api/auth/refresh`, `POST /api/imagenes`, y altas/ediciones que geocodifican contra Nominatim (política de 1 req/s; riesgo de ban de la IP). |
| 21 | Protección contra enumeración de usuarios | Parcial | 🟡 | ✔ `forgot-password` responde siempre 204. ✘ **Timing en login**: `AuthService.login` no ejecuta BCrypt si el email no existe (responde más rápido) → comparar contra un hash dummy. ✘ Registro responde "ya existe un usuario con ese email" (aceptado; evaluar mensaje genérico). ✘ `GET /api/usuarios/{id}`: `getActiveOrThrow` corre **antes** de `assertSelfOrAdmin`, así que un no-admin distingue ids existentes (403) de inexistentes (404) → invertir el orden. |
| 22 | Detección de reuso de refresh token (revocar la familia) | Pendiente | 🟠 | Agregar `familyId` a `RefreshToken`; si llega un token ya `revoked`, revocar toda la familia y loguear el evento. Antes, definir el comportamiento con varias pestañas (el single-flight de `http.ts` es por pestaña). |
| 23 | Vida máxima absoluta de sesión + limpieza de tokens | Pendiente | 🟡 | Guardar `sessionStartedAt` en la familia y no rotar pasado el máximo (p. ej. 30 días). `@Scheduled` que borre los refresh vencidos/revocados. |
| 24 | Revocación de sesiones por admin y "cerrar todas mis sesiones" | Pendiente | 🟡 | Reutilizar `revokeAllForUsuario`. Endpoints nuevos protegidos (admin / propio). |
| 25 | Headers de seguridad completos | Parcial | 🟡 | Backend (`SecurityConfig.java:73-76`): ✔ `X-Content-Type-Options: nosniff`, ✔ `X-Frame-Options: SAMEORIGIN`, ✔ Cache-Control por defecto, ✔ HSTS solo en HTTPS. ✘ `X-XSS-Protection: 1; mode=block` está obsoleto (OWASP recomienda `0` o no enviarlo). ✘ Faltan `Referrer-Policy`, `Permissions-Policy` y `frame-ancestors`. ✘ El `index.html` del SPA lo sirve otro host: los headers tienen que configurarse **también ahí**. |
| 26 | Content-Security-Policy compatible con la app | Pendiente | 🟡 | Debe permitir: `fonts.googleapis.com` / `fonts.gstatic.com` (`index.html`), `worker-src blob:` (MapLibre), los servidores de tiles/estilos del mapa y el proxy `/nominatim`. Es la defensa principal contra XSS: el access en memoria **no** impide que un script inyectado use la sesión (puede llamar a `/api/auth/refresh` con el header constante). |
| 27 | Política de contraseñas uniforme | Parcial | 🟡 | ✔ Registro: 8–72 caracteres y ≤72 bytes. ✘ Login (`LoginRequest`) solo `@Size(max=72)` en **caracteres**: con acentos se pueden superar 72 bytes y BCrypt de Spring Security puede tirar `IllegalArgumentException` (cae en el catch-all → 500). **Verificar con un test** y aplicar el mismo chequeo de bytes. Evaluar mínimo 10–12 y lista de contraseñas filtradas. |
| 28 | Subida y borrado seguro de imágenes | Parcial | 🟠 | ✔ `BE/service/ImagenService.java`: tipo validado por **magic bytes** (JPG/PNG/GIF/WEBP; sin SVG/HTML), nombre UUID, tope de 5 MB, regex en el borrado (sin path traversal), servido con `nosniff`. ✘ **`DELETE /api/imagenes/{nombre}` sin ownership**: cualquier PUBLICADOR borra imágenes de otro (los nombres son públicos en las URLs del catálogo). Guardar el dueño de cada imagen y validarlo. ✘ Sin cuota por usuario ni limpieza de huérfanas (riesgo de llenar el disco). ✘ No se quitan los metadatos EXIF (posible GPS). |
| 29 | Sinks de XSS en el frontend revisados | **Hecho** | — | Revisado 2026-11-18: `innerHTML` en `FE/components/planificador/circuito-mapa-general-view.tsx:212` y `parada-ubicacion-mapa-view.tsx:55` solo interpola el número de parada; el título va por `textContent`. `FE/components/evento-mapa.tsx` arma el popup con DOM. No hay `dangerouslySetInnerHTML`. `sitioOficial` validado `^https?://` en `EventoRequest`. **Regla:** nunca interpolar texto del usuario en `innerHTML`/`setHTML`. |
| 30 | URLs de imágenes restringidas al almacenamiento propio | Pendiente | 🟡 | `EventoRequest.imagenes` / `ActividadRequest.imagenes` aceptan cualquier string: un publicador puede apuntar a dominios externos (tracking de visitantes, contenido no moderado). Exigir el prefijo `app.imagenes.url-base` (`/api/archivos/`). |
| 31 | Datos personales en endpoints públicos | Pendiente | 🟠 | `GET /api/publicadores` y `/{id}` (anónimo o TURISTA, `SecurityConfig.java:94`) devuelven `email` y `telefono` (`PublicadorResponse`). En los publicadores autoregistrados son **el email y teléfono de la cuenta**. Decidir: avisarlo en el registro como datos de contacto públicos, o separar el contacto público del email de login. |
| 32 | Log de eventos de seguridad | Pendiente | 🟡 | Registrar login OK/fallido, 429, refresh rechazado o reusado, logout, baja, 403 repetidos. Formato estructurado, sin contraseñas, tokens ni emails completos. Hoy `AuthService` no loguea nada. |
| 33 | Auditoría de acciones de administrador | Pendiente | 🟡 | `assignRoles` / `linkPublicador` / alta de publicadores: quién, a quién, valor anterior y nuevo, cuándo. |
| 34 | CORS de producción explícito (o same-origin por proxy) | Pendiente | 🟠 | Lista cerrada de orígenes; nunca `*` con credenciales ni origen reflejado. Es la condición de la que depende #12. Documentar la decisión. |
| 35 | Reverse proxy de producción | Pendiente | 🟠 | TLS + HSTS, `forward-headers-strategy` (para #19), proxy de `/nominatim` con User-Agent identificable, límites de body/timeouts, mismo origen para `/api` y el SPA (cookie `Path=/api/auth`). Ver comentario en `turismo-frontend/vite.config.ts`. |
| 36 | Escaneo de dependencias del backend + Dependabot/Renovate | Pendiente | 🟡 | OWASP Dependency-Check o `mvn` + OSV en CI; Dependabot para Maven y npm. Auditar también las devDependencies del FE. |
| 37 | Limpieza de dependencias de runtime del frontend | Pendiente | 🟢 | Revisar en `turismo-frontend/package.json`: `cn` (el `cn()` vive en `FE/lib/utils.ts`), `shadcn` (es una CLI) y `@rolldown/binding-win32-x64-msvc` (binario solo de Windows en `dependencies`). Menos paquetes = menos superficie de supply chain. |
| 38 | Tests de autorización por matriz (rol × endpoint × dueño/no dueño) | Parcial | 🟡 | Existen tests de auth/servicios; falta un test sistemático que recorra la matriz del contrato y falle si un endpoint nuevo queda abierto. |
| 39 | H2 y consola | Parcial | 🟢 | ✔ Consola H2 **no** habilitada (no hay `spring.h2.console.enabled`). ✘ Driver H2 con `scope runtime` en el build; BD de prod sin definir (fuera del alcance de este checklist). |
| 40 | Retención y minimización de IP/User-Agent en `refresh_token` | Pendiente | 🟢 | Se guardan sin plazo. Definir retención (se resuelve con la limpieza de #23). Además, login/refresh usan `getRemoteAddr()` y el rate limit usa `X-Forwarded-For`: unificar el criterio de IP. |
| 41 | Alta de PUBLICADOR por registro público | Pendiente (decisión) | 🟠 | Hoy cualquier persona crea una cuenta PUBLICADOR y publica de inmediato. Opciones: (a) estado "pendiente de aprobación" hasta que un ADMIN lo habilite; (b) mantenerlo y declararlo explícitamente como riesgo aceptado en el contrato. |
| 42 | Protección del último ADMINISTRADOR | Pendiente | 🟢 | `UsuarioService.assignRoles` permite que un admin se cambie su propio rol. Impedir cambiarse el propio rol o dejar el sistema sin admins. |
| 43 | Cookie de refresh con prefijo `__Secure-` en prod | Pendiente | 🟢 | `__Secure-refresh_token` exige `Secure` y lo hace cumplir el navegador. (`__Host-` no aplica porque requiere `Path=/`.) |
| 44 | Normalización del email | Pendiente | 🟢 | `forgot-password` hace `trim().toLowerCase()`, pero registro (`existsByEmail`) y login (`findByEmailAndActivoTrue`) comparan exacto: `Admin@...` y `admin@...` pueden ser cuentas distintas. Normalizar en registro y login. |
| 45 | Códigos HTTP coherentes en auth/authz | Pendiente | 🟢 | Hoy credenciales inválidas, refresh inválido/vencido y rechazo ABAC devuelven **400** (`BusinessRuleException`). Recomendado: 401 en login/refresh fallidos y 403 (o 404) en ABAC. Si se cambia, ajustar `http.ts` y la #19. |
| 46 | Mensajes de error del FE sin detalles de infraestructura | Pendiente | 🟢 | `toUserMessage` (`FE/lib/http.ts:40`) menciona "puerto 8080": dejarlo solo para `import.meta.env.DEV`. |

---

## Plan de implementación sugerido (por prioridad)

1. 🔴 **#16** fail-fast de secret y cookie Secure · **#18** seed solo en `dev`.
2. 🟠 **#28** ownership en el borrado de imágenes · **#19** rate limit con IP real + por cuenta · **#41** decisión sobre el autoregistro de publicadores · **#31** datos de contacto públicos.
3. 🟠 **#22** reuso de refresh · **#20** rate limit en forgot-password/registro/uploads · **#34/#35** CORS y proxy antes de cualquier deploy · cambio/reset de contraseña (#11) con `revokeAllForUsuario`.
4. 🟡 **#21** anti-enumeración (timing, orden 404/403) · **#25/#26** headers + CSP · **#27** bytes en login · **#30** URLs de imágenes · **#32/#33** logging y auditoría · **#23/#24** sesión máxima y revocación · **#36/#38**.
5. 🟢 Resto (#37, #39, #40, #42–#46).

**Recuperación de contraseña (pendiente desde la versión anterior):** `spring-boot-starter-mail` + `spring.mail.*`; entidad de token de reset (hasheado, de un solo uso, TTL corto); `POST /api/auth/reset-password`; página FE; plantilla con link absoluto; `revokeAllForUsuario` al cambiar la clave; rate limit (#20).

---

## Discrepancias documentales detectadas (para corregir en otros archivos)

Este checklist **no** modifica otros archivos; se listan para corregirlos más adelante. En todos los casos manda [`AUTENTICACION-Y-AUTORIZACION.md`](./AUTENTICACION-Y-AUTORIZACION.md), que coincide con el código.

| Archivo | Dice | Realidad (código + contrato) |
|---|---|---|
| `AUTH-IMPLEMENTACION.md` §2.1 / §2.3 / §5 | Registro público → "siempre `TURISTA`"; `PUBLICADOR` "solo admin"; "Escalada de privilegios solo por admin" | Registro acepta `TURISTA` o `PUBLICADOR` (`UsuarioService.create`) |
| `AUTH-IMPLEMENTACION.md` §2.1 | Roles "multi-valor" | La tabla lo admite, pero siempre se guarda **un** rol |
| `AUTH-IMPLEMENTACION.md` §4 (tabla de credenciales) | Admin con roles `ADMINISTRADOR`, `TURISTA` | Admin solo `ADMINISTRADOR` (`data.sql`) |
| `AUTH-IMPLEMENTACION.md` §4 (smoke curl) | `refresh` y `logout` sin header | Sin `-H "X-Viajesazo-CSRF: 1"` responden **403** |
| `AUTH-IMPLEMENTACION.md` §4 / §2.5 | Publicador ve "Inscriptos" / "publicador sin Inscriptos" (se contradice) | Existe `GET /api/publicador/inscriptos` (solo PUBLICADOR, devuelve conteos agregados sin datos personales); la visibilidad en la UI la define el contrato |
| `AUTH-IMPLEMENTACION.md` (Referencias) | Link `../CHECKLIST-SEGURIDAD.md` | El checklist está en la misma carpeta: `./CHECKLIST-SEGURIDAD.md` |
| `AUTENTICACION-Y-AUTORIZACION.md` (matriz) | `/refresh`, `/logout` "Público" | Correcto a nivel rol, pero falta aclarar que exigen el header CSRF |
| Checklist anterior, fila 14 | "firma HS256" | El algoritmo depende del largo del secret (HS512 con el default) |

---

## Variables de entorno relevantes (backend)

| Variable | Default local | Uso | Requisito en producción |
|---|---|---|---|
| `APP_JWT_SECRET` | `change-me-viajesazo-dev-secret-...` (66 bytes, **público**) | Firma HMAC del access JWT (HS256/384/512 según el largo) | **Obligatoria**, aleatoria, ≥32 bytes (recomendado ≥64), nunca el default (#16) |
| `APP_JWT_COOKIE_SECURE` | `false` | Flag `Secure` de la cookie refresh | **`true`** (#16) |
| `APP_JWT_ISSUER` | `viajesazo` | Claim `iss` | Puede quedar el default |
| `APP_JWT_AUDIENCE` | `viajesazo-api` | Claim `aud` | Puede quedar el default |
| `HIBERNATE_SQL_LOG` | `WARN` | Nivel del logger SQL | `WARN` (nunca `DEBUG`: vuelca parámetros) |

Valores fijos en `application.properties`: access 15 min, refresh 14 días, multipart 5 MB / 6 MB, `spring.sql.init.mode=always` (ver #18).

---

## Historial de actualizaciones del checklist

| Fecha | Cambio |
|---|---|
| 2026-11-16 | Creación del checklist + refuerzos (env JWT, rate-limit, CSRF header, iss/aud, roles BD, errores FE, audit script). |
| 2026-11-18 | Revisión contra el código real. Filas 1, 6, 10, 13 y 15 pasan de Hecho a **Parcial**; fila 14 corrige el algoritmo (no siempre HS256). Se agregan columna de prioridad, sección "Fuente de verdad" (manda `AUTENTICACION-Y-AUTORIZACION.md`; contraseñas verificadas contra los hashes de `data.sql`), filas #16–#46, plan priorizado y lista de discrepancias documentales. Se corrigen los links internos. |
