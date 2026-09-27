# AGENTS.md

## Contexto

Tesis de facultad: API REST que centraliza la información turística de la provincia de Córdoba
(Argentina) y genera itinerarios personalizados según fechas, preferencias y disponibilidad.

- **Este repo es solo el backend.** El mapa, la búsqueda y el login viven en un frontend aparte.
  No generar `templates/`, vistas Thymeleaf ni assets en `static/`, aunque el scaffold los traiga vacíos.
- **El repositorio es único y contiene los dos proyectos**: este directorio y `../turismo-frontend`
  son subcarpetas del mismo repo git, no repos separados. Se puede tocar el backend y el frontend
  en el mismo commit, y es lo normal: la API y el cliente se cambian juntos. El `.gitignore` de la
  raíz es el que manda.
- Estado actual: Sprint 1 (gestión de eventos) completo, con **83 tests en verde**. Incluye
  paginación, CRUD de eventos, alta de publicadores, seed de datos y mapeo con MapStruct.
  Pendientes: `Viaje`, `Actividad`, `Itinerario`, `Usuario`, `Preferencia` y rutas/traslados.
- Para probar los endpoints a mano ver **`PRUEBAS-MANUALES.md`**: levantar, curl de cada ruta,
  casos de error, el detalle de los acentos y los bordes conocidos sin cubrir.

## Comandos

Usar el wrapper, nunca un `mvn` global. Windows/PowerShell: `.\mvnw.cmd`. Unix: `./mvnw`.

| Tarea | Comando |
| --- | --- |
| Correr la app | `.\mvnw.cmd spring-boot:run` |
| Empaquetar | `.\mvnw.cmd clean package` |
| Tests | `.\mvnw.cmd clean test` |
| Un solo test | `.\mvnw.cmd test -Dtest=TurismoBackendApplicationTests` |
| Un solo método | `.\mvnw.cmd test -Dtest=TurismoBackendApplicationTests#contextLoads` |

El wrapper descarga Maven 3.9.16 en el primer uso. `pom.xml` apunta a Java 17; el JDK local es 21.

**Usar siempre `clean test`, no `test` a secas.** `target/test-classes/` puede quedar con un
`application.properties` viejo y, como los recursos de `main` y `test` comparten el mismo nombre de
classpath, el archivo stale de test **opaca** el de `main`: los tests corren con los defaults de
Spring Data en vez de con la configuración del proyecto. Pasó de verdad y se pierde tiempo. `clean`
lo resuelve.

## Estructura de paquetes

Paquete base: `com.viajesazo.turismo_backend` — **con guion bajo**, porque el artifactId
`turismo-backend` lleva guion. No "corregirlo" a `turismobackend`.

Paquetes **por capa**: `controller/`, `service/`, `repository/`, `model/`, `dto/`, `mapper/`,
más `config/` y `exception/` para la configuración transversal y el manejo de errores.
Todo debe ir bajo el paquete base: fuera de ahí, el component scanning no lo encuentra.

## Convenciones de nombres

Esta es la regla que más fácil se rompe, porque el dominio va en español y el resto no:

| Elemento | Idioma | Ejemplos |
| --- | --- | --- |
| Clases, métodos, campos, locales, constantes | **inglés** | `ResourceNotFoundException`, `findById`, `today` |
| Entidades: nombre de clase y sus campos | **español** | `Evento.fechaInicio` |
| DTO: nombre del record y sus campos | **español** | `EventoResponse.nombre()` |
| Rutas, tablas y `spring.application.name` | **español** | `/api/eventos`, `evento`, `turismo-backend` |
| Constantes del enum `Categoria` | **español** | `CULTURA`, `NATURALEZA` |
| Mensajes de excepción, validaciones, `@DisplayName`, javadoc | **español** | `"No existe el evento con id 7"` |

Dos excepciones explícitas al patrón inglés, decididas a propósito: **`AgendaController`** y
**`AgendaSemanalTest`** conservan el nombre en español.

El JSON de los endpoints principales usa los nombres de los DTO, o sea sigue en español
(`nombre`, `fechaInicio`, `publicadorId`). **La única excepción es el cuerpo de error**, que va
en inglés: `status`, `error`, `message`, `timestamp`. Ojo: el campo se llama `message` pero su
**valor** sigue siendo texto en español.

## Dependencias (Spring Boot 4.1.1)

Los nombres de starters cambiaron respecto a Boot 3:

- Web: `spring-boot-starter-webmvc` (no `-web`).
- Tests: `spring-boot-starter-webmvc-test` y `spring-boot-starter-data-jpa-test`.
  **No existe `spring-boot-starter-test`** en este proyecto.
- Base de datos: `com.h2database:h2` con scope `runtime`. **No declarar `<version>`**: el BOM
  4.1.1 ya gestiona H2 (2.4.240), Hibernate (7.4.5), Flyway y los drivers.
- Faltan y habrá que agregar explícitamente: `spring-boot-starter-security`,
  `spring-boot-starter-restclient` y `spring-boot-starter-test` (solo si hacen falta
  utilidades compartidas; hoy cada slice ya trae lo suyo).
- En Boot 4, `RestClient` **no** está en `spring-boot-starter-webmvc`: hace falta
  `spring-boot-starter-restclient` para llamar a OSRM/Mapa desde el service.
- Jackson 3 (`tools.jackson.core`), no Jackson 2. `spring-boot-starter-json` ahora es
  `spring-boot-starter-jackson`.

### MapStruct

Mapeo entidad ↔ DTO con MapStruct `1.6.3` (propiedad `mapstruct.version`), en el paquete
`mapper/`. Requiere tres cuidados al tocar el `pom.xml`:

- `lombok-mapstruct-binding` (`0.2.0`, scope `provided`) tiene que estar **antes** que `lombok`
  en los `annotationProcessorPaths`, en las executions `default-compile` **y**
  `default-testCompile`. MapStruct corre antes que Lombok en el annotation processing: sin el
  binding, las entidades aparecen sin getters y el processor no encuentra nada que mapear.
- **El `mapstruct-processor` va solo en `default-compile`, nunca en `default-testCompile`.** En
  los tests alcanza con la implementación que ya generó la compilación principal. Si se
  declara en `default-testCompile`, el annotation processor corre otra vez sobre las
  `*MapperImpl` y falla con
  `cannot be converted to EventoMapper`: las clases implementadoras no se pueden re-procesar
  como si fueran interfaces.
- Los mappers usan `componentModel = "spring"` y `unmappedTargetPolicy = ERROR`, así que un
  campo nuevo en el DTO **rompe la compilación** hasta que se mapee a mano. Eso es lo que se
  busca; los tests usan las `*MapperImpl` generadas.
- `EventoMapper` necesita mapeos explícitos para `publicadorId` y `publicadorNombre`, porque en
  `EventoResponse` se aplanan y en `Evento` el origen es `publicador.id` / `publicador.nombre`.
  En `updateEntity` se ignora `id`, `publicador` e `imagenes` nulas.

## Base de datos: H2 en memoria, sin perfiles

Hay **un solo** `src/main/resources/application.properties` (decisión consciente: no hay
`application-dev/test/prod`). Configura H2 embebido con `jdbc:h2:mem:turismo` y
`spring.jpa.hibernate.ddl-auto=create-drop`, o sea **el esquema se borra y se recrea en cada
arranque**.

Consecuencias que hay que tener presentes:

- **No hay perfiles**: el mismo archivo configura la app y los tests. `create-drop` da un esquema
  limpio en cada arranque, así que no hace falta `src/test/resources/application.properties`.
- **Los datos no sobreviven a un reinicio.** Para una demo con datos cargados hay que sembrar por
  script (`spring.sql.init`) o cambiar a `jdbc:h2:file:./data/turismo` + `ddl-auto=update`.
- `spring.jpa.open-in-view=false`: el service tiene que mapear entidad → DTO explícitamente. No
  confiar en carga lazy dentro del controller.
- Para ver SQL en desarrollo: `logging.level.org.hibernate.SQL=DEBUG` (no `show-sql`, que escribe
  a stdout y no se puede apagar por paquete). Bajarlo antes de entregar.

### Seed: `data.sql`

`src/main/resources/data.sql` siembra 3 publicadores, 7 eventos y 5 imágenes. Como
`ddl-auto=create-drop` borra todo en cada arranque, sin el script la app levanta vacía.

Tres propiedades hacen que funcione, y las tres hacen falta:

- `spring.sql.init.mode=always` — ejecuta el script.
- `spring.jpa.defer-datasource-initialization=true` — **imprescindible**. Sin ella,
  `spring.sql.init` corre *antes* de que Hibernate cree las tablas y el script muere con
  `Table PUBLICADOR not found`. Invierte el orden para que el seed corra contra un esquema existente.
- `spring.sql.init.encoding=UTF-8` — sin esto Spring lee el script con el charset por defecto de la
  plataforma. En Windows eso es Windows-1252 y los acentos entran en la base **doblemente
  codificados**: `Cosquín` queda `CosquA-n` y `Turismo Córdoba` queda `Turismo CA3rdoba`. El bug
  solo se ve en desarrollo; en Linux el default ya es UTF-8 y pasa desapercibido. Si aparecen
  mojibake en los datos, es esto primero.

El seed usa fechas **relativas a `CURRENT_DATE`** a propósito (`DATEADD('DAY', -2, CURRENT_DATE)`,
etc.), sembrando una semana hacia atrás y dos hacia adelante: la agenda consulta de hoy al domingo
de la semana, así que con fechas fijas el demo dejaría de tener eventos en pantalla ni un mes
después de escribirlo. Al agregar filas, mantener esa propiedad.

### El seed no debe correr en los tests

El `maven-surefire-plugin` declara `spring.sql.init.mode=never` como
`systemPropertyVariables`. Se desactiva así, y **no** con un
`src/test/resources/application.properties`, por el mismo problema de shadowing de classpath
descrito arriba: ese archivo taparía el de `main` y los tests correrían con los defaults de
Spring Data. Las propiedades de sistema tienen precedencia sobre `application.properties`, así que
el seed queda apagado sin opacar nada.

Esto importa porque `EventoRepositoryTest` asserta `isEmpty()` y `containsExactly()` sobre ventanas
absolutas de septiembre 2026: si el seed corriera, los eventos caerían dentro de esas ventanas y los
tests fallarían sin que el código esté mal.

## Modelo de dominio

Nombres y campos tomados de los requerimientos de la tesis. **Solo existen `Publicador` y
`Evento` (más el enum `Categoria`)** — el resto son tipos que hay que crear. La nomenclatura del
dominio va en español (ver "Convenciones de nombres").

- `Categoria` — **ya existe**: gastronomía, familia, cultura, naturaleza, aventura. Persiste como
  `STRING`, así que en `data.sql` va el nombre de la constante en mayúsculas (`CULTURA`).
- `Publicador` — **ya existe**: nombre, email (único), teléfono. Relación unidireccional
  `Evento → Publicador`; `Publicador` no tiene `List<Evento>` a propósito, se consulta por repositorio.
- `Evento` — **ya existe**: nombre, descripción, categoría, localidad, dirección, fecha inicio/fin,
  horario inicio/fin, `imagenes` como `@ElementCollection` de URLs (`LAZY`), y `publicador` (`LAZY`,
  obligatorio). **No tiene latitud/longitud**: eso llega con el sprint de mapas.
- `Viaje` — destino, fecha de inicio y fin (de ahí se calcula la duración), preferencias asociadas.
- `Preferencia` / nivel de interés por categoría — se apoya en `Categoria`.
- `Actividad` — descripción, categoría, ubicación, horarios de disponibilidad, duración estimada,
  imágenes, publicada por un `Publicador`.
- `Itinerario` — se genera a partir de viaje + preferencias + disponibilidad; admite edición manual
  (agregar, eliminar, reorganizar) y regeneración.
- `Usuario` — registro, modificación, baja, inicio de sesión.
- Rutas y traslados — distancia entre puntos, duración estimada, visualización en mapa.

`imagenes` está en `LAZY` porque es un `@ElementCollection`: con `EAGER` cada consulta de evento
se traía todas las imágenes de la tabla entera.

## API del Sprint 1

Base `/api`. Todo en español.

| Método | Ruta | Caso de uso |
| --- | --- | --- |
| POST | `/api/publicadores` | soporte (alta de publicador) |
| GET | `/api/publicadores` | US7 — listado completo, paginado |
| GET | `/api/publicadores/{id}` | soporte |
| GET | `/api/publicadores/{id}/eventos` | US5 — eventos del publicador |
| POST | `/api/eventos` | US1 — registrar |
| GET | `/api/eventos` | US7 — listado completo, paginado |
| PUT | `/api/eventos/{id}` | US2 — modificar |
| DELETE | `/api/eventos/{id}` | US3 — baja (**física**, no lógica) |
| GET | `/api/eventos/{id}` | US4 — consultar |
| GET | `/api/agenda/semanal` | US6 — agenda de la semana ISO (lun–dom) |

Decisiones que no son obvias y conviene no deshacer sin motivo:

- **La agenda usa solapamiento, no igualdad**: `fechaFin >= :from AND e.fechaInicio <= :to`.
  Así entra un evento que empezó antes de la semana y sigue vigente.
- **El límite inferior de la semana es hoy, no el lunes.** Si se pasara el lunes, un evento del
  lunes al martes entraría igual y la agenda mostraría algo que ya pasó. Ambos comportamientos
  están cubiertos por `EventoRepositoryTest`.
- **`GET /api/eventos` no filtra por fecha.** Es el listado completo, así que trae también lo ya
  terminado y lo que todavía no empieza; la única vista con ventana temporal es la agenda semanal.
- **El orden va en el nombre del método del repository**, no en el `Pageable`: `findAllBy...`,
  `findByPublicadorIdOrderByFechaInicioAsc` y el `@Query` de la agenda. El orden es parte del
  contrato de la API, no una preferencia del cliente. Los dos listados completos ordenan por
  fecha de inicio (y hora de inicio como desempate) y por nombre de publicador, respectivamente.
- **La baja es física**, como se decidió. Cuando exista `Itinerario`, un itinerario que
  referencie un evento dado de baja va a quedar con referencia colgante: hay que decidir si
  el `DELETE` valida itinerarios asociados. Pendiente para el sprint de `Itinerario`.
- **El email del publicador es único y el mensaje de duplicado es explícito.** `POST
  /api/publicadores` hace un pre-chequeo con `PublicadorRepository.existsByEmail` y tira
  `BusinessRuleException` → 400 con `"ya existe un publicador con ese email"`. Sin ese chequeo
  el usuario recibiría el error de constraint de H2, que dice algo de un índice y no del email.
  El chequeo es solo una carrera de tiempo: dos POST simultáneos pueden pasar los dos y chocar
  en la base, así que `GlobalExceptionHandler` **también** maneja
  `DataIntegrityViolationException` y devuelve el mismo mensaje. El pre-chequeo es la
  experiencia; el handler es la red de seguridad.
  - Limitación conocida: el mensaje confirma si un email está registrado, así que habilita
    enumerar publicadores. Con autenticación en un sprint posterior conviene responder un 409
    genérico o verifica por ownership del email.
  - El `existsByEmail` es case-sensitive porque la columna también lo es. `Juan@x.com` y
    `juan@x.com` se registran como distintos. Si hay que normalizar, el lugar es el `@Setter` del
    email o una `Converter`, no el service.

### Paginación

Los cuatro listados (`/api/eventos`, `/api/publicadores`, `/api/agenda/semanal` y
`/api/publicadores/{id}/eventos`) devuelven `PagedModel` con `?page` y `?size`. El JSON tiene
esta forma:

```json
{ "content": [ ... ], "page": { "size": 20, "number": 0, "totalElements": 4, "totalPages": 2 } }
```

Ojo: **los metadatos van anidados bajo `page`**, no en el nivel superior. Es la forma de
`PagedModel` de Spring Data 4.x (Boot 4), distinta del `Page` clásico, que los ponía arriba.

Configurado en `application.properties`: `spring.data.web.pageable.default-page-size=20` y
`max-page-size=100`. El tope evita que un `?size=100000` tumbe la app. Una colección vacía
(publicador sin eventos, o la base recién arrancada sin nada cargado) devuelve una página vacía
con 200, no un 404.

## Servicios

`EventoService` y `PublicadorService` usan Lombok `@RequiredArgsConstructor` (todos los collaborators
son `final`), y `@Transactional` **granular**:

- `@Transactional` en las escrituras (`create`, `update`, `delete`).
- `@Transactional(readOnly = true)` en las lecturas (`findById`, `findByPublicadorId`,
  `findWeeklyAgenda`).

No poner `@Transactional` a nivel de clase: se mixte con la granularidad de solo lectura. Y como
`open-in-view=false`, el service mapea entidad → DTO **dentro** de la transacción, antes de
devolver; si el mapeo se hiciera afuera, cualquier acceso a una relación `LAZY` explotaría.

## Manejo de errores

`GlobalExceptionHandler` (`@RestControllerAdvice`) maneja:

| Handler | Status | Cuándo |
| --- | --- | --- |
| `handleNotFound` | 404 | `ResourceNotFoundException` |
| `handleBusinessRule` | 400 | `BusinessRuleException` (reglas de negocio) |
| `handleValidation` | 400 | `@Valid` sobre el body |
| `handleConstraintViolation` | 400 | path variables y query params |
| `handleUnreadableBody` | 400 | JSON mal formado, categoría inexistente, fecha inválida |
| `handleDataIntegrityViolation` | 400 | violación de unicidad que llega de la base (email duplicado) |
| `handleUnexpectedError` | 500 | catch-all; **no filtra el mensaje al cliente** |

Tres detalles a no romper:

- **El catch-all devuelve un mensaje genérico, no `ex.getMessage()`.** El detalle va al log, que es
  donde lo tiene que buscar quien depura: un mensaje de excepción puede traer fragmentos de SQL o
  rutas del servidor.
- **`handleDataIntegrityViolation` sigue la misma regla**: registra la excepción completa en el log
  y devuelve un mensaje fijo y en español. El mensaje crudo de Hibernate nombra la tabla, el índice
  y el valor que chocó,   y eso es un mapa de la base para cualquiera que podría llamar al alta.
- El `Clock` llega por inyección (`AppConfig.clock()`), no por `LocalDateTime.now()`. Los tests de
  la semana ISO fijan el reloj y así no dependen del día en que corren. Por el mismo motivo, los
  tres `@WebMvcTest` hacen `@Import(AppConfig.class)`: un slice no carga los beans de `config/` y
  sin ese import el `Clock` no existiría.

## Servicios externos: decisión pendiente

No hay nada cableado para mapas ni ruteo, y el repo **no tiene dónde colocar claves de API**
(sin variables de entorno, sin `.env`, sin profiles de configuración).

Antes de implementar "distancia entre puntos", "duración estimada de traslado" y "visualizar
itinerario sobre un mapa", hay que decidir entre un servicio con clave (Mapbox, Google Maps) y
uno sin clave (OpenStreetMap + OSRM). **No hardcodear claves en `application.properties`.**

## Tests: imports distintos a los de Boot 3

Las anotaciones de test **cambiaron de package**. Importar desde el package viejo no compila:

| Anotación | Package en 4.1.1 |
| --- | --- |
| `@WebMvcTest` | `org.springframework.boot.webmvc.test.autoconfigure` |
| `@DataJpaTest` | `org.springframework.boot.data.jpa.test.autoconfigure` |
| `@MockitoBean` | `org.springframework.test.context.bean.override.mockito` |

`@MockBean` ya no existe. Para tests unitarios con Mockito alcanza con
`@ExtendWith(MockitoExtension.class)` + `@Mock`, sin contexto de Spring.

Reparto actual (83 tests):

| Archivo | Tests | Cubre |
| --- | --- | --- |
| `EventoServiceTest` | 18 | US1–US5, US7, reglas de negocio |
| `EventoRepositoryTest` | 16 | solapamiento, bordes, orden, paginación, filtro por publicador, listado completo |
| `EventoControllerTest` | 15 | US1–US4, US7, errores 400/404, cuerpo inválido |
| `PublicadorControllerTest` | 10 | validación, ruta anidada, página vacía, US7, **email duplicado → 400** |
| `AgendaSemanalTest` | 7 | límites de la semana ISO, paginación |
| `PublicadorServiceTest` | 7 | alta, consulta, 404, US7, **pre-chequeo de email** |
| `AgendaControllerTest` | 4 | forma del JSON paginado, `?page`/`?size`, tope de `size` |
| `PublicadorRepositoryTest` | 5 | orden alfabético, paginación, página vacía, **derived query + constraint de unicidad** |
| `TurismoBackendApplicationTests` | 1 | `contextLoads` |

Convenciones de los tests: los **identificadores** van en inglés (métodos, constantes, locales,
helpers) y los **`@DisplayName` van en español**, porque son los que documentan los casos de uso
US1–US7 y se leen en el reporte.

## Skill de terceros: `.agents/skills/java-springboot`

Instalado con `npx skills add github/awesome-copilot --skill java-springboot`. Se carga
automáticamente en cada sesión, así que **estas decisiones del proyecto pisan al skill**:

- El skill recomienda `spring-boot-starter-web`: en Boot 4 ese nombre está **deprecado**.
  Usar `spring-boot-starter-webmvc`.
- El skill pide paquetes **por feature** y descarta explícitamente la organización por capa. Acá va
  **por capa**, es una decisión tomada.
- El skill sugiere `application.yml` y perfiles `application-dev/prod`. Acá hay **un solo**
  `application.properties` sin perfiles.
- El skill menciona `@WebMvcTest`/`@DataJpaTest` sin advertir el cambio de package (ver arriba).

El resto del skill (inyección por constructor, DTOs, `@ControllerAdvice`, `@Transactional`
granular, no exponer entidades) coincide con lo que ya hace el código.

## Convenciones

- **Indentación con tabulaciones**, no 4 espacios (default de Initializr). Igualar al archivo
  que se está editando.
- **No hay formatter, linter ni análisis estático configurado.** No existen `spotless:apply`
  ni `checkstyle`; no inventar esos comandos ni agregar plugins sin pedido explícito.
- No hay `.github/workflows`: nada corre en push ni en PR. No asumir verificación automática.
- `.github/modernize/java-upgrade/` es tooling del IDE/agente, no código del proyecto; se
  autologuea con `**/*`. Ignorarlo.
- Mockito se autocarga como agente y deja warnings de `byte-buddy` en el log. Es esperado en
  Boot 4 + JDK 21, no es un error.
- Al verificar la app a mano desde PowerShell, **`Invoke-WebRequest` miente con los acentos**:
  decodifica la respuesta como ISO-8859-1 porque el `Content-Type` es `application/json` sin
  charset, y muestra `CosquA-n` donde el servidor mandó `Cosquín` bien. Para comprobar encoding
  usar `curl.exe -o archivo.json` y leer los bytes con UTF-8 explícito, o comparar el hex
  (`í` = `0xC3 0xAD`; doblemente codificado sería `0xC3 0x83 0xC2 0xAD`). La consola de
  PowerShell tampoco renderiza acentos: un `?` en la salida no implica que el dato esté mal.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`.
- El repositorio **todavía no es un repositorio git**: hay que hacer `git init` antes de poder
  commitear.
