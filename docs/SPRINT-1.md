# Sprint 1 — Gestión de Eventos y Publicadores (as-built)

Documento **as-built** del Sprint 1 del proyecto Viajesazo: qué se construyó, cómo quedó y, sobre
todo, **por qué** cada decisión. Cubre los dos proyectos (`turismo-backend` y `turismo-frontend`).

Alcance funcional: alta, modificación, baja, consulta y listado de **eventos**; alta y consulta de
**publicadores**; y la **agenda semanal**. Fuera de alcance de este sprint (quedan para otros):
`Usuario`/autenticación, `Actividad`, `Itinerario`, `Preferencia` y rutas/traslados.

El *por qué* de cada decisión de infraestructura vive también en [`turismo-backend/AGENTS.md`](../turismo-backend/AGENTS.md)
y [`turismo-frontend/AGENTS.md`](../turismo-frontend/AGENTS.md). La integración con mapas tiene su
propio documento: [`OPENSTREETMAP.md`](./OPENSTREETMAP.md).

> Nota: el Sprint 1 base se mergeó en el commit `40fc87a` (`feat: sprint 1 con CRUD de eventos,
> publicadores y documentacion`). Los *enhancements* posteriores (tipo de acceso/arancel, estado de
> la propuesta, ubicación con geocodificación, mapa y selector) están completos y documentados acá.

---

## 1. Historias de usuario → endpoints

| HU | Descripción | Endpoint | Verbo |
| --- | --- | --- | --- |
| **US1** | Registrar evento | `/api/eventos` | `POST` |
| **US2** | Modificar evento | `/api/eventos/{id}` | `PUT` |
| **US3** | Dar de baja evento | `/api/eventos/{id}` | `DELETE` |
| **US4** | Consultar evento | `/api/eventos/{id}` | `GET` |
| **US5** | Eventos de un publicador | `/api/publicadores/{id}/eventos` | `GET` |
| **US6** | Agenda de la semana | `/api/agenda/semanal` | `GET` |
| **US7** | Listado completo | `/api/eventos`, `/api/publicadores` | `GET` |
| soporte | Alta/consulta de publicador, detalle | `/api/publicadores`, `/api/publicadores/{id}` | `POST`/`GET` |

## 2. Endpoints expuestos

Base `/api`. Rutas y JSON en **español** (nombres de los DTO). El cuerpo de error es la única
excepción: sus claves van en inglés (`status`, `error`, `message`, `timestamp`) pero el **valor** de
`message` es texto en español.

| Método | Ruta | Caso de uso |
| --- | --- | --- |
| `POST` | `/api/publicadores` | alta de publicador (soporte) |
| `GET` | `/api/publicadores` | US7 — listado completo, paginado |
| `GET` | `/api/publicadores/{id}` | soporte |
| `GET` | `/api/publicadores/{id}/eventos` | US5 — eventos del publicador |
| `POST` | `/api/eventos` | US1 — registrar |
| `GET` | `/api/eventos` | US7 — listado completo, paginado |
| `PUT` | `/api/eventos/{id}` | US2 — modificar |
| `DELETE` | `/api/eventos/{id}` | US3 — baja **física** |
| `GET` | `/api/eventos/{id}` | US4 — consultar |
| `GET` | `/api/agenda/semanal` | US6 — agenda de la semana ISO (lun–dom) |

Los cuatro listados (`/api/eventos`, `/api/publicadores`, `/api/agenda/semanal` y
`/api/publicadores/{id}/eventos`) devuelven `PagedModel` con `?page` y `?size`, con los metadatos
**anidados** bajo `page`:

```json
{ "content": [ ... ], "page": { "size": 20, "number": 0, "totalElements": 4, "totalPages": 2 } }
```

## 3. Modelo de dominio

| Tipo | Rol | Campos |
| --- | --- | --- |
| `Publicador` | quién publica el evento | `nombre`, `email` (único), `telefono` |
| `Evento` | la propuesta turística | ver tabla abajo |
| `InteresCategoria` | categoría del evento | `NATURALEZA`, `GASTRONOMIA`, `CULTURA`, `HISTORIA`, `AVENTURA`, `VIDA_NOCTURNA`, `MUSICA`, `COMPRAS`, `FAMILIAR_Y_RELAX` |
| `TipoAcceso` | gratuito o arancelado | `GRATUITO`, `DE_PAGO` |
| `EstadoPropuesta` | catálogo del ciclo de vida de la propuesta | entidad con `nombre` y `descripcion`: `INICIADO`, `REPROGRAMADO`, `CANCELADO`, `FINALIZADO` |

Campos de `Evento` (`turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Evento.java`):

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | `Long` | `IDENTITY` |
| `nombre` | `String` | obligatorio, 150 |
| `descripcion` | `String` | 1000 |
| `categoria` | `InteresCategoria` | `STRING` |
| `tipoAcceso` | `TipoAcceso` | `STRING`, `NOT NULL`, default `GRATUITO` |
| `estadoPropuesta` | `EstadoPropuesta` | FK a `estado_propuesta`, `NOT NULL`, estado inicial `INICIADO` |
| `montoEstimado` | `BigDecimal` | solo arancelados, `precision 12 scale 2` |
| `descripcionArancel` | `String` | opcional |
| `sitioOficial` | `String` | URL `http(s)`, solo arancelados |
| `lugarRecinto` | `String` | entrada del geocoding |
| `localidad` | `String` | entrada del geocoding |
| `direccion` | `String` | entrada del geocoding |
| `latitud` / `longitud` | `BigDecimal` | las **calcula el backend** con Nominatim |
| `fechaInicio` / `fechaFin` | `LocalDate` | obligatorias |
| `horarioInicio` / `horarioFin` | `LocalTime` | opcionales |
| `imagenes` | `List<String>` | `@ElementCollection` `LAZY` de URLs |
| `publicador` | `Publicador` | `@ManyToOne` `LAZY`, obligatorio |

La relación `Evento → Publicador` es **unidireccional**: `Publicador` no tiene `List<Evento>`, se
consulta por repositorio (`findByPublicadorId...`). Evita traer la lista entera por accidente.

## 4. Decisiones de diseño

### 4.1 La baja de evento es **física**, no lógica
`DELETE /api/eventos/{id}` borra la fila y responde **204**. Es una decisión tomada, no un
descuido: contrasta a propósito con la baja **lógica** de `Viaje` del Sprint 2.

> **Deuda conocida:** cuando exista `Itinerario`, un itinerario que referencie un evento dado de
> baja queda con una **referencia colgante**. Hay que decidir si el `DELETE` valida itinerarios
> asociados. Hoy no lo hace.

### 4.2 Email único con pre-chequeo + red de seguridad
`POST /api/publicadores` hace un pre-chequeo con `PublicadorRepository.existsByEmail` y lanza
`BusinessRuleException` → **400** con `"ya existe un publicador con ese email"`. Sin ese chequeo el
usuario vería el error de constraint de H2 (que habla de un índice, no del email). El pre-chequeo
es una **carrera de tiempo**: dos `POST` simultáneos pueden pasar los dos, así que
`GlobalExceptionHandler` **también** maneja `DataIntegrityViolationException` con el mismo mensaje.
El pre-chequeo es la experiencia; el handler es la red de seguridad.

- **El `existsByEmail` es case-sensitive** (la columna también lo es): `Juan@x.com` y `juan@x.com`
  son distintos. Si hay que normalizar, el lugar es el `@Setter` del email o un `Converter`, no el
  service.
- **Limitación:** el mensaje confirma si un email está registrado, lo que habilita **enumerar
  publicadores**. Con autenticación conviene un 409 genérico o verificar por ownership.

### 4.3 La agenda usa solapamiento, no igualdad
`GET /api/agenda/semanal` busca `fechaFin >= :from AND fechaInicio <= :to`, así entra un evento que
empezó antes de la semana y sigue vigente. **El límite inferior es hoy, no el lunes**: si se pasara
el lunes, un evento del lunes al martes entraría igual y la agenda mostraría algo que ya pasó.
Ambos comportamientos están cubiertos por `EventoRepositoryTest`.

### 4.4 `GET /api/eventos` no filtra por fecha
Es el **listado completo**: trae lo terminado y lo que todavía no empezó. La única vista con
ventana temporal es la agenda semanal.

### 4.5 El orden va en el nombre del método del repository
`findAllByOrderByFechaInicioAscHorarioInicioAsc`, `findByPublicadorIdOrderByFechaInicioAsc` y el
`@Query` de la agenda. El orden es **parte del contrato** de la API, no una preferencia del
cliente, así que no se delega al `Pageable`.

### 4.6 Paginación con tope
`spring.data.web.pageable.default-page-size=20` y `max-page-size=100`. El tope evita que un
`?size=100000` tumbe la app. Una colección vacía devuelve **200 con página vacía**, no 404.

### 4.7 `open-in-view=false` → el service mapea dentro de la transacción
Como la sesión de Hibernate se cierra al salir de la transacción, el service mapea entidad → DTO
**dentro** de ella, antes de devolver. Si el mapeo se hiciera afuera, cualquier acceso a una
relación `LAZY` explotaría.

### 4.8 `@Transactional` granular
Escrituras (`create`, `update`, `delete`) con `@Transactional`; lecturas (`findById`,
`findByPublicadorId`, `findWeeklyAgenda`) con `@Transactional(readOnly = true)`. **No** se pone a
nivel de clase: se mezclaría con la granularidad de solo lectura.

### 4.9 `Clock` inyectado
La semana ISO se calcula con `LocalDate.now(clock)`, donde el `Clock` lo provee `AppConfig.clock()`.
Los tests fijan el reloj y así no dependen del día en que corren. Por eso los `@WebMvcTest` hacen
`@Import(AppConfig.class)`: un slice no carga los beans de `config/`.

### 4.10 MapStruct estricto
`EventoMapper` usa `componentModel = "spring"` y `unmappedTargetPolicy = ERROR`: un campo nuevo en
el DTO **rompe la compilación** hasta que se mapee. Los mapeos explícitos de `publicadorId` /
`publicadorNombre` se hacen a mano porque en el `Response` se aplanan desde `publicador.id` /
`publicador.nombre`. En `updateEntity` se ignoran `id`, `publicador` y `tipoAcceso`, y `imagenes`
usa `NullValuePropertyMappingStrategy.IGNORE` (un `imagenes` en `null` **conserva** lo que hay; una
lista vacía lo borra).

`imagenes` es `LAZY` porque es `@ElementCollection`: con `EAGER`, cada consulta de evento se traía
las imágenes de toda la tabla.

### 4.11 Manejo de errores
`GlobalExceptionHandler` (`@RestControllerAdvice`) centraliza:

| Handler | Status | Cuándo |
| --- | --- | --- |
| `handleNotFound` | 404 | `ResourceNotFoundException` |
| `handleBusinessRule` | 400 | `BusinessRuleException` |
| `handleValidation` | 400 | `@Valid` sobre el body |
| `handleConstraintViolation` | 400 | path variables y query params |
| `handleUnreadableBody` | 400 | JSON mal formado, enum o fecha inválida |
| `handleDataIntegrityViolation` | 400 | unicidad (email duplicado) |
| `handleMissingParameter` | 400 | falta un query param obligatorio *(Sprint 2)* |
| `handleTypeMismatch` | 400 | path/query param con tipo equivocado *(Sprint 2)* |
| `handleUnexpectedError` | 500 | catch-all; **no filtra el mensaje al cliente** |

El catch-all y `handleDataIntegrityViolation` devuelven un **mensaje fijo en español** y registran
el detalle en el log: un mensaje crudo de Hibernate nombra tabla, índice y valor, y eso es un mapa
de la base para quien llame al alta.

## 5. Enhancements sobre el Sprint 1 base

Estas funcionalidades se agregaron después del merge base. Todas están implementadas en los dos
proyectos.

### 5.1 Tipo de acceso y arancel
- **Modelo:** enum `TipoAcceso` (`GRATUITO`/`DE_PAGO`) + campos `montoEstimado`,
  `descripcionArancel`, `sitioOficial`. El default es `GRATUITO`.
- **Regla (`EventoService.validateAcceso`):** un evento `DE_PAGO` **exige** `montoEstimado` y
  `sitioOficial`; `descripcionArancel` es opcional. Un `GRATUITO` **ignora** los tres.
- **Por qué la validación va en el service y no en Bean Validation:** solo aplica cuando
  `tipoAcceso == DE_PAGO`, y Bean Validation no expresa reglas condicionales entre campos sin
  validadores a medida. `@PositiveOrZero` y `@Pattern` sí son anotaciones de campo y quedan en el
  request.
- **Frontend:** el bloque de monto/link/descripción se muestra condicionalmente
  (`esDePago = watch('tipoAcceso') === 'DE_PAGO'`). Zod replica la regla con `superRefine` (monto y
  link obligatorios solo si `DE_PAGO`) y `toEventoRequest` **limpia** el arancel al pasar a
  `GRATUITO`, para no dejar un monto colgado en la base.

### 5.2 Estado de la propuesta
- **Modelo:** entidad catálogo `EstadoPropuesta`; `EventoService.create` resuelve y asigna el estado `INICIADO`.
- **No lo manda el cliente:** solo cambia por reglas de negocio (todavía sin definir). Por eso el
  `EventoMapper` **ignora** `estadoPropuesta` y el front nunca lo incluye en el request. El
  `Response` sí lo expone, y si llega `null` la UI cae en el label de `INICIADO`.

### 5.3 Ubicación con geocodificación
- **Entrada:** `lugarRecinto`, `localidad`, `direccion` (`@NotBlank`: son la entrada del geocoder).
- **Salida:** `latitud`/`longitud` (`BigDecimal`) que **calcula el backend** contra Nominatim. La
  API nunca recibe coordenadas del cliente.
- **Regla (`EventoService.applyUbicacion`, en `create` y `update`):** si no se puede geocodificar,
  lanza `BusinessRuleException` → **400** y **el evento no se guarda**. Es explícito: un evento sin
  ubicación no sirve para el mapa. En `update`, si falla, la transacción revienta antes de tocar la
  entidad, así que las coordenadas viejas quedan intactas.
- El servicio (`GeocodingService`) es **tolerante a fallos de red**: ante error devuelve
  `Optional.empty()`; decidir que eso es un error de negocio es responsabilidad de quien lo invoca.
- **Frontend:** el formulario tiene un **selector de ubicación** (buscador + mapa con pin
  arrastrable) que completa esos tres campos y es **solo UX**. La fuente de verdad de las
  coordenadas sigue siendo el backend: el selector no manda coordenadas.
- Detalle completo del flujo en [`OPENSTREETMAP.md`](./OPENSTREETMAP.md).

### 5.4 Formulario único de alta/edición
`EventoForm` es un **solo componente** para `POST` y `PUT` a propósito: duplicar el formulario
garantiza que un día diverjan. Lo único que cambia son los `defaultValues`. El componente **no
arma el body**: devuelve `EventoFormValues` y quien lo usa lo pasa por `toEventoRequest`.

### 5.5 Validación de cliente que espeja la del backend
- `schemas.ts` (Zod) duplica la validación **con los mismos mensajes** que el backend. El motivo:
  el backend aplana los errores de `@Valid` en un único string, así que del 400 no hay nada que
  parsear para pintar campo por campo; por eso la validación real de UX vive en el cliente.
- **`blankToNull`:** un input vacío es `""`, y Jackson coercionaría `""` a `null` en `LocalDate`/
  `LocalTime`. El adapter normaliza los opcionales a `null` para que viajen como "sin valor". El
  body del `POST` manda los opcionales en `null`, no en `""`.
- **Fechas y horarios:** `fechaFin >= fechaInicio` (mismo día permitido) y `horarioFin` posterior a
  `horarioInicio` solo si ambos están.
- **`toEventoFormValues`:** al hidratar un evento para editar, `horarioInicio/Fin` se recortan a
  `HH:mm` porque la API devuelve `"20:00:00"` y el `<input type="time">` no acepta segundos.

### 5.6 Mapa en el detalle del evento
`evento-detail-page` muestra `EventoMapa` **solo si `latitud` y `longitud` no son `null`**. Se usa
**Leaflet directo**, no `react-leaflet` (no soporta React 19). El mapa se monta a mano en un
`useEffect` (Leaflet es imperativo), con `scrollWheelZoom: false` para no "atrapar" el scroll de la
página, tiles de OSM con atribución y el popup armado con nodos DOM (no con un string de HTML, para
que el nombre del evento no pueda inyectar markup). En tests se mockea Leaflet: no se banca jsdom.

### 5.7 Fix del 400 de geocodificación (iteración final)
Al registrar un evento, la API devolvía **400** con direcciones que existían. Diagnóstico:
1. El cliente ponía el `display_name` **completo** de Nominatim en `direccion` y además repetía la
   localidad en los tres campos.
2. El backend armaba la query concatenando todo y una query con el término repetido (o con el
   `display_name` entero dentro de un campo) hace que el buscador free-form de Nominatim devuelva
   **`[]`**.

Solución (frontend **y** backend, sin cadena de fallback):
- **Backend:** `GeocodingService.buildQuery` **deduplica** los campos. Descarta vacíos y descarta
  un campo si contiene a uno ya incluido o está contenido en él (sin distinguir mayúsculas).
- **Frontend:** helper `direccionDe` que toma la **calle** (`road`) y nunca el `display_name`;
  nunca incluye el `house_number` (con número, la búsqueda free-form de un POI devuelve vacío).

Cubierto por `GeocodingServiceTest` (armado de la query, sin red). El detalle, con la evidencia
empírica, está en [`OPENSTREETMAP.md`](./OPENSTREETMAP.md).

## 6. Seed de datos (`data.sql`)

Siembra **3 publicadores, 8 eventos** (cada uno con una imagen y con `tipo_acceso`,
`estado_propuesta` y `latitud`/`longitud` ya calculadas), **5 ubicaciones y 5 viajes** (estos
últimos son del Sprint 2). Sin el script la app levanta vacía, porque `ddl-auto=create-drop` borra
el esquema en cada arranque.

- Las coordenadas del seed están **precalculadas** para que el mapa tenga contenido desde el
  arranque, sin pegarle a Nominatim al levantar.
- Los eventos usan fechas fijas 2026/2027; los viajes, fechas **relativas a hoy** (Sprint 2).
- Tres propiedades hacen falta y ninguna sobra: `spring.sql.init.mode=always`,
  `spring.jpa.defer-datasource-initialization=true` (sin esto el seed corre antes de que Hibernate
  cree las tablas y muere con `Table PUBLICADOR not found`) y `spring.sql.init.encoding=UTF-8` (sin
  esto, en Windows los acentos entran doblemente codificados).
- **El seed no corre en los tests:** el `maven-surefire-plugin` setea
  `spring.sql.init.mode=never` como propiedad de sistema (no con un
  `src/test/resources/application.properties`, que opacaría el de `main`).

## 7. Tests

El backend tiene **122 tests** (incluye 29 del Sprint 2). Los del Sprint 1 son:

| Archivo | Tests | Cubre |
| --- | --- | --- |
| `EventoServiceTest` | 23 | US1–US5, US7, reglas de negocio, arancel, estado, geocoding |
| `EventoRepositoryTest` | 16 | solapamiento, bordes, orden, paginación, filtro por publicador, listado completo |
| `EventoControllerTest` | 15 | US1–US4, US7, errores 400/404, cuerpo inválido |
| `PublicadorControllerTest` | 10 | validación, ruta anidada, página vacía, US7, **email duplicado → 400** |
| `AgendaSemanalTest` | 7 | límites de la semana ISO, paginación |
| `PublicadorServiceTest` | 7 | alta, consulta, 404, US7, **pre-chequeo de email** |
| `GeocodingServiceTest` | 5 | **dedup de la query de Nominatim, campos vacíos, provincia** |
| `PublicadorRepositoryTest` | 5 | orden alfabético, paginación, página vacía, **derived query + unicidad** |
| `AgendaControllerTest` | 4 | forma del JSON paginado, `?page`/`?size`, tope de `size` |
| `TurismoBackendApplicationTests` | 1 | `contextLoads` |

El frontend tiene **151 tests en 15 archivos** (149 en verde). Los relevantes al Sprint 1:

| Archivo | Tests | Cubre |
| --- | --- | --- |
| `schemas.test.ts` | 28 | validaciones, `""→null`, limpieza de arancel, imágenes, recorte de `LocalTime` |
| `evento-detail-page.test.tsx` | 16 | arancel + link, mapa sí/no, id inválido, 404/500, baja |
| `evento-editar-page.test.tsx` | 10 | precarga, recorte de segundos, `[]` borra / `null` conserva |
| `evento-nuevo-page.test.tsx` | 9 | body exacto (opcionales en `null`), alta arancelada/gratuita |
| `ubicacion-selector.test.tsx` | 8 | buscador, elegir, completar 3 campos, reverse, fallo de Nominatim |
| `evento-mapa.test.tsx` | 4 | referencia, `aria-label`, `setView`+popup, `remove()` al desmontar |

**Convenciones de test:** los identificadores (métodos, constantes, locales, helpers) van en
**inglés**; los `@DisplayName` y los `describe`/`it` legibles van en **español**, porque son los que
documentan los casos de uso US1–US7 y se leen en el reporte.

## 8. Verificación

| | Comando | Resultado |
| --- | --- | --- |
| Backend | `.\mvnw.cmd clean test` | **122 tests, 0 fallos** |
| Frontend | `npm test` | **151 tests (149 en verde)** |
| Frontend | `npm run typecheck` | OK |
| Frontend | `npm run lint` | 3 warnings preexistentes (`evento-form.tsx` useForm, `ui/badge.tsx`, `ui/button.tsx`) |

Usar siempre `clean test` en el backend, nunca `test` a secas: `target/test-classes/` puede quedar
con un `application.properties` viejo que **opaca** el de `main`.

## 9. Deuda y limitaciones conocidas

- **No hay autenticación.** Cualquiera que abra la app puede crear, editar y borrar. Es el alcance
  del Sprint 1, no una decisión de diseño.
- **Los publicadores solo se dan de alta**: no hay `PUT` ni `DELETE`.
- **Los dos tests rojos de `planificador-page.test.tsx`** (`Viajesazo` y `/cerrar/i`) son **de otro
  sprint** y son deuda aparte; no los rompió este trabajo.
- **Baja física de `Evento`** → referencias colgantes cuando exista `Itinerario` (ver 4.1).
- **Desajuste de categorías entre front y back:** el front usa 5 (`GASTRONOMIA`, `FAMILIA`,
  `CULTURA`, `NATURALEZA`, `AVENTURA`) y el backend tiene 9 (`FAMILIAR_Y_RELAX`, `HISTORIA`,
  `VIDA_NOCTURNA`, `MUSICA`, `COMPRAS` de más). `FAMILIA` (front) ≠ `FAMILIAR_Y_RELAX` (back).
- **Comentarios desincronizados** a corregir en algún momento: `evento-mapa.tsx` menciona `divIcon`
  pero usa `circleMarker`; `test/store.ts` habla de "los siete archivos de test" cuando hoy hay 15.

## 10. Criterios de aceptación → tests

| CA | Test que lo cubre |
| --- | --- |
| US1 alta | `EventoControllerTest` POST 201 + `EventoServiceTest` create |
| US2 modificación | `EventoServiceTest`/`EventoControllerTest` update + 404 |
| US3 baja | `EventoServiceTest`/`EventoControllerTest` delete físico → 204 |
| US4 consulta | `EventoControllerTest` GET detalle + 404 |
| US5 eventos del publicador | `EventoRepositoryTest` filtro + `EventoControllerTest` ruta anidada |
| US6 agenda | `EventoRepositoryTest` solapamiento/bordes + `AgendaSemanalTest` |
| US7 listados | `EventoControllerTest`/`PublicadorControllerTest`/`AgendaControllerTest` paginado |
| Arancel | `EventoServiceTest` reglas + `schemas.test.ts` front |
| Geocoding | `GeocodingServiceTest` query + `EventoServiceTest` 400 si no geocodifica |
