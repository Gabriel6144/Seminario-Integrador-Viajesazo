# Cambios y decisiones — Sprint 4: Usuarios (registro y baja)

> **Estado:** implementado en backend. **Sin frontend todavía.**
> **Última verificación:** 290 tests backend (288 en verde) con `.\mvnw.cmd clean test`. Los 2
> fallos son preexistentes y ajenos a usuarios (`ViajeMapperTest` y `ViajeTest`, por fechas fijas
> ya vencidas). Los endpoints **no se probaron todavía a mano** con la app levantada; los pasos están
> en [`PRUEBAS-MANUALES.md`](./PRUEBAS-MANUALES.md), secciones 8.24 a 8.26.
> **Referencia técnica:** `turismo-backend/AGENTS.md`, sección "API de Usuarios — registro y baja".

## 1. Resumen ejecutivo

Se agregó la entidad `Usuario` y se implementaron dos historias de usuario:

- **Registrar usuario:** alta con nombre, email, teléfono opcional y contraseña; el email es único
  y la contraseña se guarda cifrada con BCrypt.
- **Dar de baja usuario:** baja lógica de la cuenta con confirmación y contraseña; cancela los
  viajes activos del usuario.

Se completó:

- Entidad `Usuario` con email único, contraseña hasheada y baja lógica (`activo`).
- `POST /api/usuarios`, `GET /api/usuarios/{id}` y `POST /api/usuarios/{id}/baja`.
- Cifrado de contraseñas con `spring-security-crypto` (BCrypt), **sin** activar Spring Security.
- Corrección en `GlobalExceptionHandler` para que un email duplicado de usuario no responda con el
  mensaje de publicador.
- Corrección de un 500 con contraseñas con tildes o ñ (límite de 72 bytes de BCrypt).
- 27 tests nuevos (de 263 a 290).
- Documentación en `AGENTS.md` y `PRUEBAS-MANUALES.md`.

Lo que **no** incluye:

- Inicio de sesión ni autenticación (no hay Spring Security ni tokens).
- Modificación de los datos del usuario.
- Pantallas en el frontend (registro y baja).
- Relación real entre `Viaje` y `Usuario` (`Viaje.usuario` sigue siendo un `String`).

## 2. Historias de usuario y criterios de aceptación

### 2.1 Registrar usuario

*Como usuario quiero registrar una cuenta en el sistema utilizando mi correo para poder acceder a
sus funcionalidades.*

| CA | Criterio | Cómo se cumple |
| --- | --- | --- |
| CA1 | Validar nombre, mail, teléfono (opcional) y contraseña; crear la cuenta y devolver los datos registrados | `POST /api/usuarios` → **201** con `id`, `nombre`, `email`, `telefono`. Datos inválidos → **400** |
| CA2 | Si se muestran los datos del usuario, no mostrar la contraseña | `UsuarioResponse` no tiene el campo; un test verifica que no aparezca en el JSON |
| CA3 | Guardar la contraseña cifrada, nunca en texto | Hash BCrypt en `UsuarioService.create`; un test verifica que lo guardado valide con `matches` |
| CA4 | No permitir otro usuario con el mismo mail; cancelar y solicitar otro | **400** `"ya existe un usuario con ese email"` sin guardar nada. Pedir otro mail es tarea de la UI |

"Correcto ingreso" quedó definido así: nombre y email obligatorios, email con formato válido y
contraseña de entre 8 y 72 caracteres.

### 2.2 Dar de baja usuario

*Como usuario quiero dar de baja mi cuenta para dejar de utilizar el sistema y que mis datos
personales no sigan disponibles.*

| CA | Criterio | Cómo se cumple |
| --- | --- | --- |
| CA1 | Solicitar confirmación, no dar de baja si se cancela, e informar que la baja se realizó | Sin `?confirmar=true` → **409** y no se toca nada. Con éxito → **200** con `"la cuenta se dio de baja correctamente"` |
| CA2 | Solicitar la contraseña y cancelar si no es correcta | Se compara con `passwordEncoder.matches`; incorrecta → **400** `"la contraseña es incorrecta"` |
| CA3 | Marcar la cuenta como inactiva (baja lógica) | `activo = false`; la fila se conserva |
| CA4 | No permitir consultar la cuenta dada de baja e informar que no existe | `GET` y una segunda baja → **404** `"No existe el usuario con id X"`. El login futuro debe filtrar por `activo` |
| CA5 | Cancelar los viajes activos del usuario | Cancela los `BORRADOR` y `PLANIFICADO`; la respuesta informa cuántos en `viajesCancelados`. Ver decisión 4.7 |

> **Nota de redacción del CA1 de baja:** en Jira dice que se informa la baja exitosa "antes de dar
> de baja la cuenta". La implementación informa **después** de hacerla, que es el orden lógico.
> Conviene ajustar el texto.

## 3. Modelo de dominio

### 3.1 Tabla `usuario`

```text
usuario
  id           BIGINT        PK, identity
  nombre       VARCHAR(120)  NOT NULL
  email        VARCHAR(180)  NOT NULL, UNIQUE
  telefono     VARCHAR(40)
  contrasena   VARCHAR(100)  NOT NULL   ← hash BCrypt (60 caracteres), nunca texto plano
  activo       BOOLEAN       NOT NULL   ← baja lógica, default true
```

`usuario` **no** tiene FK con `viaje`. `viaje.usuario` es un texto libre (ver 4.8).

### 3.2 Entidad

| Elemento | Responsabilidad |
| --- | --- |
| `Usuario` | Datos de la cuenta, hash de la contraseña y estado activo/inactivo. |
| `Usuario.darDeBaja()` | Única forma de pasar a inactivo. |

`Usuario` usa Lombok (`@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`). La versión inicial
del archivo tenía además los constructores escritos a mano y **no compilaba**, porque chocaban con
los que genera Lombok; se quitaron.

## 4. Decisiones técnicas

### 4.1 Tabla resumen

| Decisión | Por qué | Alternativa descartada | Consecuencia |
| --- | --- | --- | --- |
| BCrypt para contraseñas | Salt aleatorio y costo alto: resiste ataques por fuerza bruta | SHA-256 o texto plano | Hash distinto en cada `encode`; se compara con `matches` |
| `spring-security-crypto` | Solo trae el cifrado | `spring-boot-starter-security` | No se activa el login obligatorio en todos los endpoints |
| `PasswordEncoder` como bean | Un único punto de configuración, reutilizable en el login | `new BCryptPasswordEncoder()` en el service | `config/PasswordConfig` |
| El mapper ignora `contrasena` | Un olvido del hash no guarda texto plano en silencio | Copiarla y pisarla después | Un olvido deja `null` y la base lo rechaza |
| Validar 72 **bytes** además de 72 caracteres | BCrypt rechaza más de 72 bytes; `@Size` cuenta caracteres | Solo `@Size` | Contraseñas con ñ/tildes → 400 en vez de 500 |
| Email único con pre-chequeo + constraint | Mismo patrón que `Publicador` | Solo la constraint | Mensaje claro; la carrera la cubre el handler |
| Baja lógica con `activo` booleano | `Usuario` no tiene ciclo de vida con estados | Enum de estados como `Viaje` | Lecturas por id con `findByIdAndActivoTrue` |
| `POST /{id}/baja` en lugar de `DELETE` | La baja lleva la contraseña en el body | `DELETE` con body | Hay clientes y proxies que descartan el body de un `DELETE` |
| `?confirmar=true` → 409 sin él | Mismo patrón que la eliminación de paradas (VZ-29) | Confirmación solo en la UI | Se puede probar sin frontend |
| Contraseña incorrecta → 400 | Es una regla de negocio y no hay autenticación todavía | 401 | Se usa `BusinessRuleException`, como el resto de la API |
| No cancelar viajes `EN_CURSO` | El dominio no permite `EN_CURSO → CANCELADO` | Cambiar la regla de `EstadoViaje` | Esos viajes siguen hasta que el scheduler los finaliza |
| Viajes asociados por email | `Viaje.usuario` es un `String` sin FK | Migrar a `@ManyToOne` en esta US | Un viaje con otro identificador no se cancela |

### 4.2 Por qué BCrypt y no otro algoritmo

- **Salt aleatorio:** cada `encode` genera un hash distinto aunque la contraseña sea la misma. Dos
  usuarios con `"secreta123"` quedan con hashes diferentes.
- **Lento a propósito:** el costo (10 por defecto) hace que probar millones de contraseñas contra
  una base robada sea muy caro.
- **Consecuencia práctica:** nunca comparar hashes con `equals`. Para verificar una contraseña se
  usa `passwordEncoder.matches(textoPlano, hashGuardado)`.

### 4.3 Por qué el mapper ignora la contraseña

`UsuarioMapper.toEntity` tiene `@Mapping(target = "contrasena", ignore = true)`. El hash lo asigna
`UsuarioService` en una línea explícita:

```java
Usuario usuario = mapper.toEntity(request);                            // contrasena = null
usuario.setContrasena(passwordEncoder.encode(request.contrasena()));   // hash BCrypt
usuarioRepository.save(usuario);
```

Si el mapper copiara la contraseña y alguien borrara la línea del `encode`, se guardaría el texto
plano **sin que nada falle**. Con el campo ignorado, el olvido deja `contrasena = null`, la base lo
rechaza (`nullable = false`) y el error aparece enseguida. **No quitar el `ignore = true`.**

### 4.4 El límite de 72 bytes (bug encontrado y corregido)

- BCrypt solo procesa 72 bytes. La versión de Spring Security del proyecto **lanza
  `IllegalArgumentException`** si se supera; las viejas truncaban en silencio.
- `@Size(max = 72)` cuenta **caracteres**, pero en UTF-8 una tilde o una ñ ocupan **2 bytes**.
- Resultado antes del arreglo: una contraseña de 40 `ñ` (40 caracteres, 80 bytes) pasaba la
  validación y la API respondía **500**. Se verificó con la versión real del proyecto.
- Arreglo: `UsuarioService.create` chequea `getBytes(UTF_8).length > 72` antes del `encode` y
  responde **400** `"la contraseña es demasiado larga: las letras con tilde o ñ ocupan el doble"`.
  Lo cubre `UsuarioServiceTest.rejectsPasswordOverBcryptByteLimit`.

### 4.5 Email duplicado: pre-chequeo y red de seguridad

- **Pre-chequeo:** `UsuarioRepository.existsByEmail` antes de guardar → 400 con mensaje claro.
- **Red de seguridad:** dos registros simultáneos pueden pasar los dos el pre-chequeo. El segundo
  choca con la constraint `UNIQUE` y llega una `DataIntegrityViolationException` a
  `GlobalExceptionHandler`.
- **Bug corregido en el handler:** antes, cualquier violación que mencionara `email` respondía
  `"ya existe un publicador con ese email"`, también para usuarios. Ahora se busca primero el
  índice `usuario(email`.
- **No buscar `usuario` a secas:** `viaje` tiene una columna `usuario` que aparece en el SQL de
  cualquier violación sobre viajes, y respondería con el mensaje equivocado.

Limitaciones heredadas del patrón de `Publicador`:

- Es **case-sensitive**: `Ana@mail.com` y `ana@mail.com` se registran como usuarios distintos.
- El mensaje confirma que un email está registrado, lo que permite averiguar qué emails existen.

### 4.6 Orden de los chequeos de la baja

El orden es parte del contrato y está cubierto por tests:

1. Body sin `contrasena` → **400** (`@Valid`, antes de entrar al service).
2. Usuario inexistente o ya dado de baja → **404**.
3. Sin `confirmar=true` → **409**.
4. Contraseña incorrecta → **400**.
5. Baja: `activo = false` y cancelación de viajes, **en la misma transacción**. Si falla una
   cancelación, la cuenta no queda dada de baja a medias.

### 4.7 Viajes `EN_CURSO` (CA5 de la baja)

`EstadoViaje` solo permite `EN_CURSO → FINALIZADO`. Para no cambiar una regla del dominio dentro
de esta US:

- Se cancelan los viajes `BORRADOR` y `PLANIFICADO`.
- Los `EN_CURSO` quedan como están y el scheduler los finaliza al terminar.
- Los terminales (`CANCELADO`, `FINALIZADO`) no se tocan.

Si el equipo decide que "viajes activos" incluye los que están en curso, hay dos caminos: permitir
`EN_CURSO → CANCELADO` en `EstadoViaje`, o bloquear la baja mientras haya un viaje en curso.

### 4.8 Viajes asociados por email

`Viaje.usuario` es un `String` libre desde el Sprint 2. La baja busca los viajes con
`findByUsuarioAndEstadoIn(usuario.getEmail(), ...)`:

- Funciona con el seed, que guarda emails (`turista.demo@viajesazo.com`).
- **No** cancela viajes cargados con otro identificador, como `turista_demo` en los fixtures del
  frontend.
- Se resuelve al migrar `Viaje.usuario` a un `@ManyToOne` con `Usuario` (ver pendientes).

### 4.9 Re-registro de un email dado de baja

Hoy **no** se permite: `existsByEmail` incluye a los inactivos y la constraint `UNIQUE` sigue
vigente. Registrar de nuevo un email dado de baja responde `"ya existe un usuario con ese email"`.
Es una decisión abierta (ver pendientes).

## 5. Cambios por archivo

Rutas relativas a `turismo-backend/src/main/java/com/viajesazo/turismo_backend/` y a la carpeta
equivalente de tests.

### 5.1 Nuevos

**Configuración**

- `config/PasswordConfig.java`: bean `PasswordEncoder` (BCrypt).

**API y DTOs**

- `controller/UsuarioController.java`
- `dto/request/UsuarioRequest.java`
- `dto/request/BajaUsuarioRequest.java`
- `dto/response/UsuarioResponse.java`
- `dto/response/BajaUsuarioResponse.java`
- `mapper/UsuarioMapper.java`

**Dominio, repositorio y servicio**

- `model/Usuario.java`
- `repository/UsuarioRepository.java`
- `service/UsuarioService.java`

**Tests**

- `controller/UsuarioControllerTest.java`
- `repository/UsuarioRepositoryTest.java`
- `service/UsuarioServiceTest.java`

### 5.2 Modificados

- `pom.xml`: dependencia `spring-security-crypto`.
- `exception/GlobalExceptionHandler.java`: mensaje de duplicado de usuario en
  `handleIntegrityViolation`.
- `repository/ViajeRepository.java`: `findByUsuarioAndEstadoIn`, para la baja.
- `repository/ViajeRepositoryTest.java`: test de `findByUsuarioAndEstadoIn`.
- `turismo-backend/AGENTS.md`: estado, dependencias, modelo, sección de usuarios, errores y tests.
- `docs/sprint4/PRUEBAS-MANUALES.md`: secciones 8.24 a 8.26 y bordes conocidos.

## 6. API

| Método | Ruta | Descripción | Respuestas |
| --- | --- | --- | --- |
| `POST` | `/api/usuarios` | Registrar usuario | **201**, 400 |
| `GET` | `/api/usuarios/{id}` | Consultar usuario activo (soporte) | **200**, 404 |
| `POST` | `/api/usuarios/{id}/baja?confirmar=true` | Dar de baja la cuenta | **200**, 400, 404, 409 |

### 6.1 Registrar

Request:

```json
{
  "nombre": "Ana Pérez",
  "email": "ana.perez@mail.com",
  "telefono": "351-5551234",
  "contrasena": "secreta123"
}
```

Response **201**:

```json
{ "id": 1, "nombre": "Ana Pérez", "email": "ana.perez@mail.com", "telefono": "351-5551234" }
```

| Campo | Reglas |
| --- | --- |
| `nombre` | Obligatorio, hasta 120 caracteres |
| `email` | Obligatorio, formato válido, hasta 180 caracteres, único |
| `telefono` | Opcional, hasta 40 caracteres |
| `contrasena` | Obligatoria, 8 a 72 caracteres y como máximo 72 bytes |

El campo se llama `contrasena`, **sin ñ**.

### 6.2 Dar de baja

Request (`POST /api/usuarios/1/baja?confirmar=true`):

```json
{ "contrasena": "secreta123" }
```

Response **200**:

```json
{ "id": 1, "mensaje": "la cuenta se dio de baja correctamente", "viajesCancelados": 2 }
```

| Caso | Status | `message` |
| --- | --- | --- |
| Sin `?confirmar=true` | 409 | `la baja de la cuenta requiere confirmación; confirmá con confirmar=true` |
| Body sin `contrasena` | 400 | `contrasena: la contraseña es obligatoria` |
| Contraseña incorrecta | 400 | `la contraseña es incorrecta` |
| Usuario inexistente o ya dado de baja | 404 | `No existe el usuario con id 1` |

## 7. Testing

Comando:

```powershell
cd turismo-backend
.\mvnw.cmd clean test
```

Resultado: **290 tests, 288 en verde y 2 fallos preexistentes** (`ViajeMapperTest` y `ViajeTest`).

| Suite | Tests | Cubre |
| --- | ---: | --- |
| `UsuarioControllerTest` | 12 | Registro 201 sin `contrasena` en la respuesta; faltantes, email inválido y contraseña corta → 400; duplicado (negocio y constraint) con mensaje de usuario; 404; baja 200/409/400/404 |
| `UsuarioServiceTest` | 11 | Alta; hash BCrypt verificable; más de 72 bytes → 400; pre-chequeo de email; consulta y 404; baja que inactiva y cancela viajes; solo `BORRADOR`/`PLANIFICADO`; sin confirmar o con contraseña incorrecta no se toca nada; ya dado de baja → 404 |
| `UsuarioRepositoryTest` | 3 | `existsByEmail`; `findByIdAndActivoTrue` excluye inactivos; constraint de unicidad (el mensaje nombra `usuario(email`) |
| `ViajeRepositoryTest` | +1 | Viajes por usuario y estados, para la baja |

No cubierto por la suite:

- Prueba manual con la app levantada (pendiente).
- Concurrencia real de dos registros simultáneos (el handler se prueba con la excepción simulada).

## 8. Pendientes

### P0 — para cerrar las US

| Pendiente | Por qué | Criterio de aceptación |
| --- | --- | --- |
| Prueba manual de los tres endpoints | Solo se corrieron tests automáticos | Secciones 8.24 a 8.26 de `PRUEBAS-MANUALES.md` verificadas |
| Pantallas de registro y baja | El usuario final no puede usar las US sin UI | Formularios contra la API, con confirmación previa a la baja |
| Ajustar la redacción del CA1 de baja en Jira | Informa el éxito antes de la baja | El CA dice "una vez realizada, debe informar…" |
| Decidir viajes `EN_CURSO` | Hoy no se cancelan (4.7) | Decisión del equipo registrada en Jira |
| Decidir re-registro de un email dado de baja | Hoy no se permite (4.9) | No permitir, permitir con cuenta nueva o reactivar |

### P1 — deuda funcional

| Pendiente | Por qué | Criterio de aceptación |
| --- | --- | --- |
| Inicio de sesión | No hay autenticación; cualquiera puede consultar `GET /api/usuarios/{id}` | Login con `matches` y filtro por `activo`; cada usuario accede solo a su cuenta |
| Modificación de datos del usuario | US pendiente | `PUT /api/usuarios/{id}` sin poder cambiar la contraseña por esa vía |
| Email sin distinguir mayúsculas | `Ana@mail.com` y `ana@mail.com` son dos cuentas | Normalizar a minúsculas al guardar y al buscar |
| Mensaje genérico para emails existentes | El mensaje actual revela qué emails están registrados | Revisar al implementar el login |

### P2 — deuda técnica

| Pendiente | Por qué | Criterio de aceptación |
| --- | --- | --- |
| `Viaje.usuario` como `@ManyToOne` con `Usuario` | Hoy es texto libre y la baja asocia por email | FK real, migración del seed y fin del `?usuario=` en el listado |
| Quitar `spring-security-crypto` al agregar Security | El starter ya lo incluye | Una sola dependencia de seguridad en el `pom.xml` |

## 9. Guía rápida para el equipo

### Probar a mano

```powershell
cd turismo-backend
.\mvnw.cmd spring-boot:run
```

Guardar el JSON de 6.1 en `usuario.json` y enviarlo con `--data-binary` (inline, PowerShell rompe
las comillas):

```powershell
curl.exe -s -i -X POST http://localhost:8080/api/usuarios `
  -H "Content-Type: application/json; charset=utf-8" `
  --data-binary "@usuario.json"
```

El seed **no** carga usuarios: la tabla arranca vacía en cada inicio. Para probar la cancelación
de viajes, registrar un usuario con `turista.demo@viajesazo.com`, el email de los viajes del seed.

### Errores comunes

- **MapStruct "Unmapped target property" al agregar un campo a `Usuario`:** agregar el campo al
  request o un `@Mapping(ignore = true)` en `UsuarioMapper`. No desactivar la política de error.
- **Usar `findById` para leer un usuario:** devuelve también los dados de baja. Usar
  `findByIdAndActivoTrue`.
- **Comparar contraseñas con `equals`:** nunca va a coincidir por el salt. Usar `matches`.

## 10. Glosario

| Término | Significado |
| --- | --- |
| Hash | Resultado de aplicar una función de un solo sentido: del hash no se obtiene la contraseña. |
| BCrypt | Algoritmo de hash para contraseñas, con salt aleatorio y costo configurable. |
| Salt | Valor aleatorio que se agrega antes de hashear, para que la misma contraseña dé hashes distintos. |
| Baja lógica | Marcar un registro como inactivo sin borrarlo de la base. |
| Pre-chequeo | Validación previa al guardado para dar un mensaje claro antes de que falle la base. |
| Derived query | Consulta que Spring Data arma a partir del nombre del método (`existsByEmail`). |

## 11. Referencias

- `turismo-backend/AGENTS.md`: sección "API de Usuarios — registro y baja".
- [`PRUEBAS-MANUALES.md`](./PRUEBAS-MANUALES.md): secciones 8.24 a 8.26.
- [`CAMBIOS-Y-DECISIONES-SPRINT-3.md`](../sprint3/CAMBIOS-Y-DECISIONES-SPRINT-3.md): formato de
  referencia y decisiones de errores (400 vs 422).
