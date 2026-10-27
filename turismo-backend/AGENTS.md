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
- Estado actual: Sprints 1–3 completos (eventos, viajes, agenda VZ-18 y circuitos VZ-25), con
  **229 tests: 227 en verde y 2 fallos preexistentes por fechas fijas ya vencidas
  (`ViajeMapperTest`, `ViajeTest`)**. Incluye paginación, CRUD de eventos, alta de publicadores,
  CRUD de viajes con baja lógica, listado unificado de propuestas (eventos + actividades),
  **agenda filtrable por fecha/tipo/categoría/ubicación/acceso**, **generación y selección única de
  tres alternativas de circuito con distancias estimadas**, seed de datos, mapeo con MapStruct,
  **geocodificación de la ubicación del evento con OpenStreetMap (Nominatim)** y **subida de
  imágenes a disco con servido estático**. Pendientes: `Itinerario` editable (VZ-27), `Usuario`,
  `Preferencia` y ruteo real (OSRM).
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
| Constantes del enum `InteresCategoria` | **español** | `CULTURA`, `NATURALEZA` |
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
- Faltan y habrá que agregar explícitamente: `spring-boot-starter-security` y
  `spring-boot-starter-test` (solo si hacen falta utilidades compartidas; hoy cada slice ya trae
  lo suyo).
- En Boot 4, `RestClient` **no** está en `spring-boot-starter-webmvc`: hace falta
  `spring-boot-starter-restclient` para llamar a servicios externos. **Ya está agregado**, y lo
  usa `GeocodingService` para pegarle a Nominatim.
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

`src/main/resources/data.sql` siembra 3 publicadores, 23 eventos (8 con imagen), 2 actividades,
30 ubicaciones y 5 viajes. Como `ddl-auto=create-drop` borra todo en cada arranque, sin el script
la app levanta vacía. Los eventos del seed traen `tipo_acceso`, `estado_propuesta` y
`latitud`/`longitud` de ejemplo (ya calculadas, sin pasar por Nominatim en el arranque). El bloque
VZ-25 agrega 15 eventos futuros (tres por zona, incluida una propuesta nocturna) con fechas
relativas para que el demo de circuitos funcione cualquier día.

Nota de Sprint 2: los viajes se siembran **después** de las ubicaciones, porque `zonaInteres` es
una FK a `ubicacion`. Todos van con `estado='PLANIFICADO'` a propósito: VZ-22 lista con
`estado <> 'CANCELADO'`, y una fila con `estado` en NULL quedaría fuera de la comparación
(`NULL <> 'CANCELADO'` no es verdadero).

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

Los **viajes** y las **propuestas del bloque VZ-25** usan fechas **relativas a hoy** a propósito
(`DATEADD('DAY', 7, CURRENT_DATE)`, etc.), así el demo siempre tiene viajes y circuitos futuros
sin importar cuándo se levante. Al agregar filas para el demo, mantener esa propiedad. Los **8
eventos originales** siguen con fechas **fijas** 2026/2027; si se quiere que también aparezcan en
la agenda vigente, hay que pasarlos a `DATEADD('DAY', n, CURRENT_DATE)`.

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

Nombres y campos tomados de los requerimientos de la tesis. **Ya existen `Publicador`, `Evento`,
`Ubicacion` y `Viaje`** (más los enums `InteresCategoria`, `TipoRitmo` y `EstadoViaje`) — el
resto son tipos que hay que crear. La nomenclatura del dominio va en español (ver "Convenciones
de nombres").

- `InteresCategoria` — **ya existe** (antes se llamaba `Categoria`; se renombró porque ahora la
  comparten `Evento` y `Viaje`): `NATURALEZA`, `GASTRONOMIA`, `CULTURA`, `HISTORIA`, `AVENTURA`,
  `VIDA_NOCTURNA`, `MUSICA`, `COMPRAS`, `FAMILIAR_Y_RELAX`. Persiste como `STRING`, así que en
  `data.sql` va el nombre de la constante en mayúsculas (`CULTURA`).
- `Publicador` — **ya existe**: nombre, email (único), teléfono. Relación unidireccional
  `Evento → Publicador`; `Publicador` no tiene `List<Evento>` a propósito, se consulta por repositorio.
- `Evento` — **ya existe**: nombre, descripción, categoría, tipo de acceso (`TipoAcceso`),
  estado de la propuesta (`EstadoPropuesta`), lugar/recinto, localidad, dirección, latitud/longitud
  (`BigDecimal`, las calcula el backend), arancel (monto estimado, descripción y link al sitio
  oficial, solo para eventos arancelados), fecha inicio/fin, horario inicio/fin, `imagenes` como
  `@ElementCollection` de URLs (`LAZY`), y `publicador` (`LAZY`, obligatorio). Ver
  "Geocodificación y acceso" más abajo.
- `TipoAcceso` — **ya existe** (`model/TipoAcceso.java`): `GRATUITO`, `DE_PAGO`. Persiste como
  `STRING`. `Evento.tipoAcceso` tiene default `GRATUITO`.
- `EstadoPropuesta` — **ya existe** (`model/EstadoPropuesta.java`): `INICIADO`, `REPROGRAMADO`,
  `CANCELADO`, `FINALIZADO`. Persiste como `STRING` con default `INICIADO`. **No lo manda el
  cliente**: lo setea `EventoService` al registrar y solo cambia por reglas de negocio (a definir).
- `Ubicacion` — **ya existe** (`model/Ubicacion.java`): `ciudad`, `localidad`, `latitud`/`longitud`
  (`BigDecimal` con `precision`/`scale`). Es la zona de interés del viaje.
- `Viaje` — **ya existe** (`model/Viaje.java`): `nombre`, `zonaInteres` (`@ManyToOne` a `Ubicacion`
  por `zona_interes_id`, obligatoria), `rangoInteresKm` (`double`), `fechaInicio`/`fechaFin`
  (`LocalDateTime`), `ritmo` (`TipoRitmo`), `interesesCategoria` (`@ElementCollection` de
  `InteresCategoria`) y `usuario` (`String`). La baja lógica se modela con `estado` (`EstadoViaje`),
  **no** con un `activo` booleano (ver "API del Sprint 2").
- `EstadoViaje` — **ya existe**: `BORRADOR`, `PLANIFICADO`, `EN_CURSO`, `FINALIZADO`, `CANCELADO`.
  Las transiciones válidas viven en el enum (`puedeTransicionarA`); `FINALIZADO` y `CANCELADO` son
  terminales. `CANCELADO` se usa para la baja lógica tanto de viajes como de borradores.
- `TipoRitmo` — **ya existe**: `TRANQUILO`, `EQUILIBRADO`, `INTENSIVO`.
- `Preferencia` / nivel de interés por categoría — se apoya en `Categoria`.
- `Actividad` — descripción, categoría, ubicación, horarios de disponibilidad, duración estimada,
  imágenes, publicada por un `Publicador`.
- `Circuito` — **ya existe** (VZ-25): tres alternativas generadas a partir de viaje + propuestas +
  disponibilidad, guardadas como snapshot. `CircuitoAlternativa` agrupa los ítems y
  `CircuitoItem` guarda la parada con fecha, orden, horario y traslado.
- `Itinerario` editable — **pendiente (VZ-27)**: agregar, eliminar, reorganizar y regenerar
  paradas sobre el circuito ya generado.
- `Usuario` — registro, modificación, baja, inicio de sesión.
- Rutas y traslados — hoy Haversine con velocidad media; falta ruteo real (OSRM) y visualización
  en mapa.

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
  terminado y lo que todavía no empieza; las vistas con ventana temporal son `/api/agenda`
  (filtrable) y `/api/agenda/semanal` (semana en curso).
- **El orden va en el nombre del método del repository**, no en el `Pageable`: `findAllBy...`,
  `findByPublicadorIdOrderByFechaInicioAsc` y el `@Query` de la agenda. El orden es parte del
  contrato de la API, no una preferencia del cliente. Los dos listados completos ordenan por
  fecha de inicio (y hora de inicio como desempate) y por nombre de publicador, respectivamente.
  **Excepción:** `/api/agenda` (VZ-18) arma su orden fijo en `PropuestaQueryService.AGENDA_SORT`
  y descarta el `Sort` del cliente.
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

Los cinco listados (`/api/eventos`, `/api/publicadores`, `/api/agenda`, `/api/agenda/semanal` y
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

## API del Sprint 2 — Viajes

Base `/api`. Mismas convenciones que el Sprint 1 (rutas y JSON en español, paginación con
`PagedModel` anidado).

| Método | Ruta | Caso de uso |
| --- | --- | --- |
| POST | `/api/viajes` | VZ-19 — registrar viaje |
| PUT | `/api/viajes/{id}` | VZ-21 — modificar |
| GET | `/api/viajes?usuario=&page=&size=` | VZ-22 — listar viajes activos del turista |
| DELETE | `/api/viajes/{id}` | VZ-23 — baja **lógica** |
| GET | `/api/viajes/{id}` | soporte (detalle para editar) |

Decisiones que no son obvias y conviene no deshacer sin motivo:

- **La baja es lógica** (VZ-23). A diferencia de `Evento`, cuya baja es **física**, `DELETE
  /api/viajes/{id}` marca `estado = CANCELADO` y responde **204**. No "corregirla" a física: es
  la primera baja lógica del proyecto y está pedida así.
- **"Activo" = `estado <> CANCELADO`**, no un campo `activo` booleano. El listado y el detalle usan
  `findByUsuarioAndEstadoNotOrderByFechaInicioAsc` y `findByIdAndEstadoNot`; un viaje cancelado
  deja de existir para la API (el listado no lo muestra, `GET /{id}` → 404, `PUT` → 404).
- **"Mis viajes" filtra por `usuario` (String), no por `turistaId`.** No hay entidad `Usuario`
  todavía; es deuda. `GET /api/viajes` **exige** `?usuario=` y sin él responde **400** (lo maneja
  `handleMissingParameter`).
- **La API expone `LocalDate`; la entidad guarda `LocalDateTime`.** `ViajeMapper` convierte con
  helpers `default` (medianoche). El tipo de persistencia no se filtra al contrato de la API.
- **`POST` fuerza `estado = PLANIFICADO`** e ignora el `estado` que viniera en el body; `PUT`
  tampoco permite cambiarlo (el mapeo de update lo ignora). Los cambios de `estado` los hacen las
  transiciones de dominio (`completar borrador`, `DELETE`) y el scheduler de fechas; el cliente
  nunca manda el estado.
- **La confirmación previa de VZ-23 CA1 es de la UI** (AlertDialog); el backend solo expone el
  `DELETE`.

Deuda conocida: `usuario` es un `String` sin FK, igual que el `email` de `Publicador`. Cuando
exista `Usuario`/autenticación hay que migrar a una relación real.

## API del Sprint 3 — Agenda turística (VZ-18)

| Método | Ruta | Caso de uso |
| --- | --- | --- |
| GET | `/api/agenda?fechaDesde=&fechaHasta=&tipoPropuesta=&categoria=&ubicacion=&tipoAcceso=&page=&size=` | VZ-18 — agenda filtrable, ordenada por fecha y con detalle en `/api/eventos/{id}` |

Decisiones que no son obvias:

- **`/api/agenda` es distinta de `/api/agenda/semanal`.** La semanal (US6) conserva su contrato:
  ventana de hoy al domingo, sin filtros y con `EventoResponse`. La nueva agenda acepta filtros y
  devuelve `PropuestaResumenResponse`, pero **siempre solo eventos** (`tipo = EVENTO`).
- **El orden es fijo y lo pone el backend**: `fechaInicio ASC, horarioInicio ASC`. El `Pageable` del
  cliente se ignora a propósito; no es una preferencia del usuario. El orden vive en
  `PropuestaQueryService.AGENDA_SORT`, no en el nombre del método del repository.
- **Sin `fechaDesde` la ventana arranca hoy** (`LocalDate.now(clock)`), así los eventos terminados
  no aparecen. La comparación es por **solapamiento**: `fechaFin >= fechaDesde` y
  `fechaInicio <= fechaHasta`, igual que la agenda semanal.
- **Se excluyen los `CANCELADO`** con `PropuestaSpecifications.notCancelled()`. No se excluyen los
  `FINALIZADO` por nombre de estado: los saca la ventana de fechas.
- **`ubicacion` es texto libre** sobre `localidad`, `lugarRecinto` y `direccion`, sin distinguir
  mayúsculas ni tildes. La normalización se hace en Java (`Normalizer`) y en SQL/H2 con
  `translate(...)`; `localidad` exacta usa la misma normalización. Agregar tildes nuevas obliga a
  extender `ACCENTED`/`UNACCENTED` en `PropuestaSpecifications`.
- **El detalle reutiliza `GET /api/eventos/{id}`**; no hay endpoint de detalle de agenda.
- **`/api/propuestas` también acepta `ubicacion`** (mismo criterio), además de los filtros que ya
  tenía.

## API del Sprint 3 – Circuitos automáticos (VZ-25)

| Método | Ruta | Caso de uso |
| --- | --- | --- |
| POST | `/api/viajes/{id}/circuito` | Genera y persiste las tres alternativas (**201**) |
| GET | `/api/viajes/{id}/circuito` | Devuelve el circuito guardado (404 si no existe) |
| POST | `/api/viajes/{id}/circuito/seleccion` | Selecciona una alternativa (200) |

Las alternativas son `CERCANIA`, `INTERESES` y `DESCUBRIMIENTO`. Se generan una sola vez y se
guardan como instantánea: regenerar devuelve `400`, igual que una segunda selección. La selección
queda expuesta en `GET /api/viajes/{id}` dentro de `circuito`; el `GET` del circuito no persiste
nada al refrescar disponibilidad.

Decisiones y trampas:

- **El motor (`circuit/CircuitGenerator`) no conoce Spring ni JPA.** Recibe candidatos, ritmo e
  intereses, y devuelve alternativas. `CircuitoService` arma los candidatos y persiste el snapshot.
- **Ventana diaria `06:00–23:59`.** Las actividades se agendan en el horario exacto de su franja;
  el traslado tiene que caber antes del inicio. Un evento sin horario ocupa `09:00–18:00`.
- **Las distancias son Haversine** (`HaversineDistanceProvider`, 30 km/h), no OSRM. La respuesta
  trae `distanciasEstimadas=true`.
- **El snapshot guarda `descripcion` y `categoria`**, no solo el id: si la propuesta cambia o se
  da de baja, el circuito sigue mostrando lo que se generó, marcando `disponible=false`.
- **`CircuitoAlternativa.items` usa `@OrderBy("orden ASC")`, nunca `@OrderColumn`.** El campo
  `CircuitoItem.orden` ya es una columna real; un `@OrderColumn(name = "orden")` la duplicaba y al
  releer la lista llegaban `null`, con NPE en `toResponse`/`refreshAvailability`. Lo cubre
  `CircuitoRepositoryTest`.
- **`data.sql` necesita subconsultas únicas para la zona del viaje.** Las ubicaciones de eventos
  comparten `ciudad`, así que buscar solo por ciudad devuelve varias filas; en el seed se agrega
  `AND direccion IS NULL` para Córdoba y La Cumbrecita.
- **Errores de generación**: `404` si el viaje no existe (o está cancelado), `400` si faltan datos,
  si el viaje no tiene días o si ya fue generado. Los estados terminales no se pueden generar.

## Servicios

`EventoService` y `PublicadorService` usan Lombok `@RequiredArgsConstructor` (todos los collaborators
son `final`), y `@Transactional` **granular**:

- `@Transactional` en las escrituras (`create`, `update`, `delete`).
- `@Transactional(readOnly = true)` en las lecturas (`findById`, `findByPublicadorId`,
  `findWeeklyAgenda`, `searchAgenda`).

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
| `handleMissingParameter` | 400 | falta un query param obligatorio (`GET /api/viajes` sin `usuario`) |
| `handleTypeMismatch` | 400 | path variable o query param con el tipo equivocado (`/api/viajes/abc`) |
| `handleMaxUploadSize` | 400 | la imagen subida supera los 5 MB (`MaxUploadSizeExceededException`) |
| `handleMissingPart` | 400 | falta la parte `archivo` en el multipart (`MissingServletRequestPartException`) |
| `handleMissingResource` | 404 | imagen/estático inexistente bajo `app.imagenes.url-base` (`NoResourceFoundException`) |
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
  `@WebMvcTest` (`EventoControllerTest`, `PublicadorControllerTest`, `AgendaControllerTest`,
  `ViajeControllerTest`, `ImagenControllerTest` y `ImagenServingTest`) hacen
  `@Import(AppConfig.class)`: un slice no carga los beans de `config/` y sin ese import el `Clock`
  no existiría.

Dos handlers del Sprint 2 evitan un 500 en casos de borde de la API de viajes:
`handleMissingParameter` (`GET /api/viajes` sin `?usuario` → 400) y `handleTypeMismatch`
(`GET /api/viajes/abc` con id no numérico → 400).

## Imágenes de eventos (subida a disco + servido estático)

`Evento.imagenes` sigue siendo un `@ElementCollection` de URLs: **no se tocó la entidad, ni el
`EventoRequest/Response`, ni el mapper**. Lo que cambió es cómo el publicador puebla esos strings:
además de pegar una URL externa, ahora puede **subir un archivo**, que queda en disco y se sirve
como estático. Flujo: subida **previa** (`POST /api/imagenes` devuelve `{ "url": ... }`) y luego se
crea el evento con esa URL, igual que con las externas.

| Método | Ruta | Qué hace |
| --- | --- | --- |
| POST | `/api/imagenes` | multipart, parte `archivo`; guarda y devuelve **201** `{ "url": "/api/archivos/<uuid>.<ext>" }` |
| GET | `/api/archivos/**` | sirve el archivo subido como estático (lo registra `WebConfig`) |
| DELETE | `/api/imagenes/{nombre}` | borra un archivo; **204** |

Piezas: `ImagenService` (`guardar`/`borrar`, valida **magic bytes** de JPEG/PNG/GIF/WEBP, tope
`MAX_BYTES = 5 MB`, nombre UUID y anti *path traversal*), `ImagenResponse` (`{url}`),
`ImagenController` y `WebConfig`. Config en `application.properties`: `app.imagenes.dir=./data/imagenes`
(carpeta en disco, **no versionada**: el `.gitignore` de la raíz ignora `data/`) y
`app.imagenes.url-base`, más `spring.servlet.multipart.max-file-size=5MB` / `max-request-size=6MB`.

Decisiones y trampas a no repetir:

- **El prefijo de servido (`app.imagenes.url-base`) NO puede solaparse con el del controller.**
  El default es `/api/archivos`, distinto de `/api/imagenes`. Con el prefijo viejo (`/api/imagenes`),
  un `GET /api/imagenes/{archivo}` hacía match con el `@DeleteMapping("/{nombre}")` y Spring lanzaba
  una excepción de método no soportado **antes** de llegar al resource handler (y como el catch-all
  la convertía en 500, la imagen subida no se veía nunca). Si se cambia `url-base`, verificar que
  ningún controller mapee ese prefijo. Lo cubre `ImagenServingTest`.
- **El servido cuelga de `/api` a propósito**: así lo reenvía el proxy de Vite y el navegador lo ve
  *same-origin*, sin CORS. No moverlo a `/uploads` u otra ruta fuera de `/api` sin resolver el proxy.
- **`handleMissingResource` es necesario** porque el resource handler lanza `NoResourceFoundException`
  para archivos inexistentes (una URL vieja en la base): sin ese handler el catch-all respondería 500
  en lugar de 404.
- **El alcance de borrado es el archivo suelto**, no las URLs guardadas en eventos: un evento que
  referencie un archivo borrado simplemente muestra el placeholder en el frontend.
- **Limitación conocida**: con `ddl-auto=create-drop` la base se vacía en cada arranque pero
  `data/imagenes/` no, así que los archivos subidos quedan **huérfanos**. Si molesta, migrar a
  `jdbc:h2:file:./data/turismo` + `ddl-auto=update`, o barrer huérfanos al arrancar.
- La subida es **previa** al `POST /api/eventos`: si el evento no se llega a crear, el archivo ya
  subido queda en disco (sin limpieza automática). Es una simplificación aceptada.

## Geocodificación y acceso (OpenStreetMap)

La ubicación del evento se resuelve **en el backend** con **Nominatim** (el geocoder de
OpenStreetMap), que **no requiere clave de API**.

- `GeocodingConfig` arma un bean `RestClient` (`nominatimRestClient`) con la base URL y el header
  `User-Agent`. `GeocodingService.geocode(lugarRecinto, localidad, direccion)` arma una query
  (`"lugar, dirección, localidad, Córdoba, Argentina"`) y devuelve `Optional<Coordenadas>`
  (`latitud`/`longitud` como `BigDecimal`).
- **La query se deduplica** (`GeocodingService.buildQuery`): se descartan los campos vacíos y los
  que repiten a otro (sin distinguir mayúsculas, en cualquier sentido). El cliente suele mandar la
  misma localidad en los tres campos —o el `display_name` entero de Nominatim en `direccion`— y
  una query con el término repetido devuelve `[]` en el buscador free-form. Con el dedup, `"
  Villa Carlos Paz"` en los tres campos colapsa a `"Villa Carlos Paz, Córdoba, Argentina"`.
  Cubierto por `GeocodingServiceTest` (unit test del armado, sin red).
- **Nominatim exige un `User-Agent` identificable** (política de uso). Va en
  `application.properties`: `geocoding.nominatim.base-url` y `geocoding.nominatim.user-agent`. Si
  se cambia el servicio, primero mirar su política de uso (límite ~1 request/segundo).
- **Tolerante a fallos de red**: un error de conexión devuelve `Optional.empty()`; un fallo del
  query es lo mismo que "no encontrado". La red no debe tirar un 500.
- `EventoService.applyUbicacion` corre en `create` y `update`: si geocodifica, guarda
  `latitud`/`longitud` en el `Evento`; si no encuentra la dirección, lanza
  `BusinessRuleException` → **400** y **el evento no se guarda**. Es una decisión explícita: un
  evento sin ubicación no sirve para el mapa.
- `EventoRequest` exige `lugarRecinto`, `localidad` y `direccion` (`@NotBlank`): son la entrada
  del geocoding.
- En `update`, si no se pudo geocodificar, la transacción revienta antes de tocar la entidad, así
  que las coordenadas viejas quedan intactas.

Reglas de arancel (`EventoService.validateAcceso`): un evento `DE_PAGO` **exige** `montoEstimado`
(`@PositiveOrZero`) y `sitioOficial` (`@Pattern` de URL `http(s)`); la `descripcionArancel` es
opcional. Un `GRATUITO` ignora los tres campos. El estado (`EstadoPropuesta`) y el tipo de acceso
por defecto los fija el service, no el JSON.

## Ruteo / distancias

`GeocodingService` cubre el "dónde queda" del evento. Para los circuitos, `DistanceProvider` usa
**Haversine** con una velocidad media de 30 km/h: alcanza para comparar alternativas y estimar
traslados, pero **no es un ruteo real**. Si se necesita respetar calles, la opción natural es
**OSRM** (sin clave, sobre OpenStreetMap), en línea con la decisión de Nominatim. **No hardcodear
claves en `application.properties`.**

## Tests: imports distintos a los de Boot 3

Las anotaciones de test **cambiaron de package**. Importar desde el package viejo no compila:

| Anotación | Package en 4.1.1 |
| --- | --- |
| `@WebMvcTest` | `org.springframework.boot.webmvc.test.autoconfigure` |
| `@DataJpaTest` | `org.springframework.boot.data.jpa.test.autoconfigure` |
| `@MockitoBean` | `org.springframework.test.context.bean.override.mockito` |

`@MockBean` ya no existe. Para tests unitarios con Mockito alcanza con
`@ExtendWith(MockitoExtension.class)` + `@Mock`, sin contexto de Spring.

Reparto actual (229 tests; 2 fallos preexistentes por fechas fijas ya vencidas en `ViajeMapperTest`
y `ViajeTest`):

| Archivo | Tests | Cubre |
| --- | --- | --- |
| `PropuestaServiceTest` | 23 | US1–US5, US7, reglas de negocio, arancel, estado, geocoding |
| `PropuestaRepositoryTest` | 18 | listado unificado, filtros, orden, **agenda VZ-18 (orden, solapamiento, cancelados, ubicación sin tildes)** |
| `ViajeControllerTest` | 23 | VZ-19/VZ-21/VZ-22/VZ-23 + **VZ-25 circuitos**, 400/404, `?usuario` obligatorio |
| `EventoRepositoryTest` | 16 | solapamiento, bordes, orden, paginación, filtro por publicador, listado completo |
| `EventoControllerTest` | 15 | US1–US4, US7, errores 400/404, cuerpo inválido |
| `PropuestaTuristicaTest` | 11 | invariantes del modelo base |
| `ViajeTest` | 11 | modelo de viaje, transiciones y validaciones (**1 fallo preexistente por fecha fija**) |
| `ViajeServiceTest` | 11 | VZ-19–VZ-23, baja lógica, fecha invertida, 404 |
| `PublicadorControllerTest` | 10 | validación, ruta anidada, página vacía, US7, **email duplicado → 400** |
| `ActividadServiceTest` | 9 | reglas de actividad |
| `ActividadControllerTest` | 8 | CRUD de `/api/actividades`, validación, 400/404 |
| `AgendaControllerTest` | 7 | `/api/agenda` (filtros, orden fijo, 400) y `/api/agenda/semanal` (paginación, tope de `size`) |
| `AgendaSemanalTest` | 7 | límites de la semana ISO, paginación |
| `CircuitGeneratorTest` | 7 | **VZ-25: ventana 06:00–23:59, agenda, ritmo, estrategias y traslados** |
| `CircuitoServiceTest` | 8 | **VZ-25: generación, snapshot, selección única, disponibilidad y errores** |
| `PublicadorServiceTest` | 7 | alta, consulta, 404, US7, **pre-chequeo de email** |
| `ImagenServiceTest` | 6 | **guardar/borrar, magic bytes, tope 5 MB, anti path traversal (`@TempDir`)** |
| `GeocodingServiceTest` | 5 | **dedup de la query de Nominatim, campos vacíos, provincia** |
| `PublicadorRepositoryTest` | 5 | orden alfabético, paginación, página vacía, **derived query + constraint de unicidad** |
| `ViajeMapperTest` | 4 | mapeo entidad↔DTO, fechas `LocalDate`↔`LocalDateTime` (**1 fallo preexistente por fecha fija**) |
| `ViajeRepositoryTest` | 4 | activos por usuario, exclusión de cancelados, orden |
| `CircuitoRepositoryTest` | 1 | **VZ-25: recarga el circuito con ítems ordenados y sin `null`** |
| `ImagenControllerTest` | 4 | **POST/DELETE de `/api/imagenes`, parte faltante y archivo vacío → 400** |
| `PropuestaControllerTest` | 3 | listado unificado, filtros (incluida `ubicacion`), 400 |
| `EstadoViajeTest` | 3 | transiciones válidas e inválidas |
| `ImagenServingTest` | 2 | **sirve la imagen subida bajo `/api/archivos`; inexistente → 404** |
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
- El repositorio **es un repo git único** con los dos proyectos como subcarpetas; se commitea
  desde la raíz, con el `.gitignore` de la raíz.
