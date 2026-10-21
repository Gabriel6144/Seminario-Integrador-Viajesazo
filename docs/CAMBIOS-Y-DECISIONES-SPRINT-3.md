# Cambios y decisiones — Sprint 3

> **Estado:** implementado y verificado en backend.
> **Última verificación:** 177 tests en verde, arranque con `data.sql` correcto y endpoints principales respondiendo 200.
> **Documento de API para frontend:** [`API-PROPUESTAS-FRONTEND.md`](./API-PROPUESTAS-FRONTEND.md)
> **Documento histórico:** [`HERENCIA-PROPUESTA-TURISTICA.md`](./HERENCIA-PROPUESTA-TURISTICA.md). Ese documento fue el diseño inicial y quedó desactualizado; ante cualquier diferencia, manda este documento y el código.

## 1. Resumen ejecutivo

El Sprint 3 transformó el modelo de propuestas turísticas para que eventos y actividades compartan una misma base, puedan consultarse juntos y tengan reglas de negocio explícitas.

Se completó:

- Herencia JPA `JOINED` con tabla base `propuesta_turistica`.
- Separación entre el discriminador de persistencia (`subtipo`) y el tipo de negocio (`tipo_propuesta`).
- Entidad `Actividad` con duración y franjas horarias (`Disponibilidad`).
- CRUD completo de actividades en `/api/actividades`.
- Listado unificado `/api/propuestas` con filtros, paginación y orden controlado.
- Renombre de `EventoService` a `PropuestaService` para el CRUD de eventos.
- Validaciones de dominio con respuesta `422 ProblemDetail`.
- Control de concurrencia optimista con `@Version` y respuesta `409 ProblemDetail`.
- Seed reescrito para el esquema nuevo, con fechas relativas y dos actividades de ejemplo.
- 177 tests automatizados en verde.

Lo que **no** incluye este sprint:

- Cambios en el frontend.
- Migraciones de base de datos para producción (`create-drop` sigue siendo el modo de desarrollo).
- Autenticación/autorización.
- Pruebas reales contra Nominatim en la suite automatizada.
- Endpoint para cambiar el estado de una propuesta (la regla existe en el dominio, pero no está expuesta por HTTP).

## 2. Contexto: por qué cambió el modelo

Antes, `PropuestaTuristica` era una `@MappedSuperclass`:

- No existía una tabla para la clase base.
- Los campos comunes se repetían en `evento` y `actividad`.
- No se podía consultar “todas las propuestas” de forma polimórfica.
- La ubicación estaba duplicada como columnas planas en varias entidades.

Con `@Inheritance(strategy = InheritanceType.JOINED)`:

- `propuesta_turistica` concentra los datos comunes.
- Hibernate inserta primero en la tabla base y luego en la tabla hija con el mismo `id`.
- Al leer, Hibernate hace el JOIN y devuelve la clase concreta (`Evento` o `Actividad`).
- Se pueden consultar ambas con un repositorio sobre la base.

### Comparación de estrategias

| Estrategia | Ventaja | Problema | Decisión |
| --- | --- | --- | --- |
| `SINGLE_TABLE` | Una sola tabla, consultas simples | Muchas columnas null, mezcla campos de eventos y actividades | Descartada |
| `TABLE_PER_CLASS` | Cada clase tiene su tabla completa | `UNION` costoso, FKs y consultas polimórficas más difíciles | Descartada |
| `JOINED` | Modelo normalizado, polimorfismo real, escalable | Requiere JOIN y migración de datos | **Elegida** |

## 3. Modelo de dominio

### 3.1 Diagrama de tablas

```text
publicador 1 ──── * propuesta_turistica * ──── 1 estado_propuesta
                         │  │
                         │  └── 1 ubicacion
                         │
                         ├── 1:1 evento
                         │        id (FK)
                         │        fecha_inicio, fecha_fin
                         │        horario_inicio, horario_fin
                         │        monto_estimado, descripcion_arancel, sitio_oficial
                         │
                         ├── 1:1 actividad
                         │        id (FK)
                         │        duracion_minutos
                         │
                         ├── * propuesta_imagen (propuesta_id, url, orden)
                         │
                         └── actividad 1 ──── * actividad_disponibilidad
                                                    (actividad_id, orden, dia_semana, hora_inicio, hora_fin)
```

`ubicacion` también se usa desde `viaje.zona_interes_id`.

### 3.2 Tres conceptos que no hay que confundir

| Concepto | Dónde vive | Valores | Para qué sirve |
| --- | --- | --- | --- |
| `subtipo` | Columna discriminadora de JPA | `EVENTO`, `ACTIVIDAD` | Que Hibernate sepa qué clase concreta instanciar. |
| `tipoPropuesta` | Enum de negocio persistido | `FERIA`, `CONGRESO`, `ENCUENTRO`, `DEPORTIVO`, `ESPECTACULO`, `JORNADA`, `EXPOSICION`, `VISITA_GUIADA`, `FESTIVAL` | Describir la naturaleza turística. |
| `tipo` | Campo calculado que expone la API | `EVENTO`, `ACTIVIDAD` | Que el frontend sepa qué forma tiene el recurso, sin mirar la clase Java. |

> **Corrección importante:** el documento viejo decía que el discriminador se llamaba `tipo_propuesta`. En el código actual el discriminador es **`subtipo`**. `tipo_propuesta` es el enum de negocio. La separación evita que un cambio en los tipos turísticos rompa la persistencia polimórfica.

### 3.3 Entidades

| Entidad | Responsabilidad |
| --- | --- |
| `PropuestaTuristica` | Base abstracta: id, versión, nombre, descripción, tipo de propuesta, categoría, modalidad, tipo de acceso, estado, lugar/recinto, ubicación, publicador, imágenes e invariantes comunes. |
| `Evento` | Fechas, horarios, monto, descripción de arancel y sitio oficial. |
| `Actividad` | Duración en minutos y lista ordenada de `Disponibilidad`. |
| `Disponibilidad` | `@Embeddable` con día de semana y rango horario. No tiene identidad ni repositorio propio. |
| `Ubicacion` | `ciudad`, `localidad`, `direccion`, `latitud`, `longitud`. Compartida con `Viaje`. |
| `Publicador` | Dueño de la propuesta. Obligatorio. |
| `EstadoPropuesta` | Estado persistido con nombre y descripción. |

### 3.4 Reglas de estado

Los nombres válidos están centralizados en `NombreEstado`:

```text
INICIADO ──────► REPROGRAMADO ──────► REPROGRAMADO
   │                  │
   ├──► CANCELADO     ├──► CANCELADO
   └──► FINALIZADO    └──► FINALIZADO
```

- `CANCELADO` y `FINALIZADO` son terminales.
- Una propuesta terminal no se puede editar ni volver a transicionar.
- Las transiciones inválidas se responden como **400** porque son una regla de negocio, no una violación de invariante estructural.

### 3.5 Invariantes

Son condiciones que no deberían romperse nunca. Se validan en el servicio antes de guardar y también en `@PrePersist`/`@PreUpdate` como red de seguridad.

Comunes:

- Nombre obligatorio.
- `tipoPropuesta` obligatorio y permitido para el subtipo.
- Estado y publicador obligatorios.
- Ubicación obligatoria.
- Imágenes nunca `null` (se normaliza a lista vacía).

De evento:

- Fechas de inicio y fin obligatorias.
- `fechaFin` no anterior a `fechaInicio`.
- Si hay ambos horarios, `horarioFin` posterior a `horarioInicio`.
- Si `tipoAcceso = DE_PAGO`, monto y sitio oficial obligatorios.

De actividad:

- `duracionMinutos > 0`.
- Cada franja debe tener día, hora de inicio y hora de fin.
- La hora de fin debe ser posterior a la de inicio.
- La lista de franjas puede estar vacía.

### 3.6 Concurrencia

`PropuestaTuristica` tiene `@Version`. Si dos personas editan la misma propuesta, la segunda escritura falla con `OptimisticLockingFailureException` y la API responde **409 Conflict**. El frontend debe recargar y reintentar.

## 4. Decisiones técnicas

### 4.1 Tabla resumen

| Decisión | Por qué | Alternativa descartada | Consecuencia |
| --- | --- | --- | --- |
| Herencia `JOINED` | Modelo normalizado y polimorfismo real | `SINGLE_TABLE`, `TABLE_PER_CLASS` | Más JOINs, pero consultas y modelo más claros. |
| Discriminador `subtipo` | No mezclar persistencia con negocio | Usar `tipo_propuesta` como discriminador | Dos campos con propósitos distintos. |
| `TipoRegistro` en la API | El frontend no depende de clases Java | Devolver `instanceof` o el nombre de la clase | Campo `tipo` estable. |
| `Ubicacion` compartida | Evitar duplicar dirección y coordenadas | Columnas planas en cada entidad | `ViajeMapper` debe ignorar `direccion` al mapear `UbicacionRequest`. |
| Imágenes en la base | Eventos y actividades comparten imágenes | Tabla `evento_imagen` exclusiva | `propuesta_imagen` con `orden`. |
| `Disponibilidad` como `@Embeddable` | No tiene identidad propia | Entidad con repositorio | Se guarda en `actividad_disponibilidad`. |
| `@Version` | Detectar ediciones concurrentes | Bloqueo pesimista | 409 y reintento en frontend. |
| `InvariantViolationException` → 422 | Es un error semántico del dominio | Devolver 400 genérico | `ProblemDetail` solo para estos casos. |
| `BusinessRuleException` → 400 | Es una regla de negocio esperable | Convertirlo a 422 | Se mantiene el contrato histórico. |
| `ProblemDetail` para 409 | Formato estándar para conflicto | `ErrorResponse` | Nuevo formato solo en casos nuevos. |
| `@JdbcTypeCode(SqlTypes.VARCHAR)` | Forzar el guardado del enum como texto y evitar los check constraints problemáticos de H2 | Confiar en el mapeo nativo de Hibernate | Enums guardados como `VARCHAR`. |
| H2 `2.3.232` | La 2.4.240 tiene una regresión con enums | Usar la última versión | Versión fijada en `pom.xml`. |
| `default_batch_fetch_size=20` | Evitar N+1 en colecciones LAZY | EAGER o JOIN FETCH manual | Menos consultas al listar. |
| `PropuestaService` para eventos | Alinear el servicio con el agregado | Dejar `EventoService` | El nombre puede revisarse; ver pendientes. |
| `ActividadService` separado | No inflar un servicio con dos CRUD | Un solo servicio gigante | Responsabilidades claras. |
| `PropuestaQueryService` separado | La consulta es solo lectura y polimórfica | Meterla en `PropuestaService` | No se mezcla escritura con búsqueda. |
| Specifications | Filtros opcionales dinámicos y tipados | JPQL con muchos `if` | `treat` para campos de subtipo. |
| Whitelist de orden | Evitar errores 500 y propiedades arbitrarias | Aceptar cualquier `sort` | 400 con mensaje claro. |
| DTO resumen plano | Un solo contrato para la lista | Jerarquía de DTOs | Campos nulos según subtipo. |
| Mapper manual del resumen | MapStruct no resuelve bien campos de ambos subtipos | Forzar MapStruct con expresiones | Mapeo explícito y legible. |
| Seed con fechas relativas | La agenda no queda vacía con el tiempo | Fechas fijas | `CURRENT_DATE` + `DATEADD`. |
| No `@NotNull tipoPropuesta` | No romper contratos actuales | Validación Bean Validation | El dominio responde 422; pendiente revisar. |

### 4.2 Por qué 422 y no 400 para invariantes

- **400** se usa para datos mal formados o reglas de negocio esperables: falta un campo validado por Bean Validation, una fecha de fin anterior a la de inicio, un evento arancelado sin monto.
- **422** se usa cuando el request está bien formado pero dejaría el agregado en un estado inválido: un `tipoPropuesta` que no corresponde al subtipo, una actividad sin duración, una propuesta sin ubicación.

La separación permite que el frontend distinga “corregí el formulario” (400) de “el dominio rechazó esta combinación” (422).

### 4.3 Por qué no se migraron todos los errores a `ProblemDetail`

Migrar todos los handlers habría cambiado el contrato de error de endpoints que el frontend ya consume. En este sprint se usó `ProblemDetail` solo para los casos nuevos (422 y 409) y se mantuvo `ErrorResponse` para el resto. La migración completa queda como deuda técnica.

### 4.4 Cómo funciona el listado unificado

`GET /api/propuestas` recibe filtros opcionales y construye una `Specification`:

- `tipo` se compara con `root.type()` (el discriminador).
- Los campos de evento se leen con `cb.treat(root, Evento.class)`.
- Los campos de actividad se leen con `cb.treat(root, Actividad.class)`.
- Nunca se usa `root.getClass()` ni reflexión sobre la clase Java.

El orden también se aplica dentro de la especificación:

- Se valida contra una whitelist.
- Los campos de evento requieren `tipo=EVENTO`.
- Los campos de actividad requieren `tipo=ACTIVIDAD`.
- Se omite en la consulta de conteo (`query.getResultType() == Long.class`), porque ordenar un `count` no tiene sentido.

## 5. Cambios por archivo

### 5.1 Nuevos

**Dominio**

- `model/Actividad.java`
- `model/Disponibilidad.java`
- `model/NombreEstado.java`
- `model/TipoPropuesta.java`
- `model/TipoRegistro.java`

**Repositorios**

- `repository/ActividadRepository.java`
- `repository/PropuestaRepository.java`
- `repository/PropuestaSpecifications.java`
- `repository/UbicacionRepository.java`

**Servicios**

- `service/ActividadService.java`
- `service/PropuestaQueryService.java`
- `service/PropuestaService.java` (reemplaza a `EventoService`)

**API y DTOs**

- `controller/ActividadController.java`
- `controller/PropuestaController.java`
- `dto/request/ActividadRequest.java`
- `dto/request/DisponibilidadRequest.java`
- `dto/request/PropuestaFiltro.java`
- `dto/response/ActividadResponse.java`
- `dto/response/DisponibilidadResponse.java`
- `dto/response/PropuestaResumenResponse.java`
- `mapper/ActividadMapper.java`
- `mapper/PropuestaResumenMapper.java`
- `exception/InvariantViolationException.java`

**Tests**

- `controller/ActividadControllerTest.java`
- `controller/PropuestaControllerTest.java`
- `model/PropuestaTuristicaTest.java`
- `repository/PropuestaRepositoryTest.java`
- `service/ActividadServiceTest.java`
- `service/PropuestaServiceTest.java` (reemplaza a `EventoServiceTest`)

### 5.2 Modificados

- `pom.xml`: pin de H2.
- `application.properties`: batch fetch.
- `model/PropuestaTuristica.java`: herencia, versión, imágenes, invariantes, estado.
- `model/Evento.java`: builder, invariantes, `getTipo`, tipos permitidos.
- `model/Actividad.java`: franjas y reglas.
- `model/Ubicacion.java`: `direccion`.
- `model/Viaje.java`: `@JdbcTypeCode` en enums.
- `dto/request/EventoRequest.java`: `modalidad`, `tipoPropuesta`.
- `dto/response/EventoResponse.java`: `tipo`, `tipoPropuesta`, `modalidad`.
- `mapper/EventoMapper.java`: ignora `version`/`ubicacion`, mapea campos de ubicación.
- `mapper/ViajeMapper.java`: ignora `direccion` al mapear `UbicacionRequest`.
- `exception/GlobalExceptionHandler.java`: 422 y 409 con `ProblemDetail`.
- `controller/EventoController.java`, `AgendaController.java`, `PublicadorController.java`: usan `PropuestaService`.
- `data.sql`: reescrito para JOINED, fechas relativas y actividades.
- Tests de controller, repositorio y agenda actualizados por el nuevo modelo.

### 5.3 Eliminados

- `model/Categoria.java` (clase sin uso; el tipo de propuesta se modela con `TipoPropuesta`).
- `service/EventoService.java` (renombrado a `PropuestaService`).
- `service/EventoServiceTest.java` (renombrado a `PropuestaServiceTest`).

## 6. API

La referencia completa con ejemplos de request/response y tipos TypeScript está en [`API-PROPUESTAS-FRONTEND.md`](./API-PROPUESTAS-FRONTEND.md).

Resumen de endpoints:

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/propuestas` | Listado unificado de eventos y actividades con filtros. |
| `POST` | `/api/eventos` | Crea un evento. |
| `GET` | `/api/eventos` | Lista eventos paginados. |
| `GET` | `/api/eventos/{id}` | Detalle de evento. |
| `PUT` | `/api/eventos/{id}` | Actualiza evento. |
| `DELETE` | `/api/eventos/{id}` | Elimina evento. |
| `POST` | `/api/actividades` | Crea una actividad. |
| `GET` | `/api/actividades` | Lista actividades paginadas. |
| `GET` | `/api/actividades/{id}` | Detalle de actividad. |
| `PUT` | `/api/actividades/{id}` | Actualiza actividad. |
| `DELETE` | `/api/actividades/{id}` | Elimina actividad. |
| `GET` | `/api/agenda/semanal` | Eventos de la semana ISO en curso. |
| `GET` | `/api/publicadores/{id}/eventos` | Eventos de un publicador. |

## 7. Datos de demo

`data.sql` se reescribió porque el esquema cambió y el seed viejo insertaba directo en `evento` con columnas que ya no existen ahí.

Estructura del seed:

1. Publicadores.
2. Estados de propuesta.
3. Ubicaciones de viajes.
4. Ubicaciones de eventos y actividades.
5. `propuesta_turistica` (base).
6. `evento` o `actividad` (hija).
7. `propuesta_imagen` / `actividad_disponibilidad`.
8. Viajes.

Decisiones del seed:

- Fechas relativas con `CURRENT_DATE` para que la agenda semanal siempre tenga contenido.
- Subconsultas por nombre o dirección para no depender de IDs autoincrementales.
- `version = 0` explícito porque la columna es `NOT NULL`.
- `subtipo` explícito en la tabla base.
- Dos actividades con disponibilidades para probar el listado unificado.

Resultado verificado con la app levantada:

| Endpoint | Resultado |
| --- | --- |
| `/api/propuestas` | 10 propuestas (8 eventos + 2 actividades) |
| `/api/eventos` | 8 eventos |
| `/api/actividades` | 2 actividades |
| `/api/agenda/semanal` | 2 eventos |
| `/api/viajes?usuario=turista.demo@viajesazo.com` | 2 viajes |

> Durante la reescritura del seed apareció un error de subconsulta ambigua: al agregar una ubicación de actividad en Carlos Paz, la subconsulta de viajes por ciudad devolvía dos filas. Se corrigió agregando `direccion IS NULL` para distinguir la ubicación de viaje. Es una advertencia para futuros seeds: **toda subconsulta escalar debe devolver exactamente una fila**.

## 8. Testing

Comando:

```powershell
cd turismo-backend
.\mvnw.cmd clean test
```

> Usar siempre `clean test`. Un `application.properties` viejo en `target/test-classes` puede opacar el de `main`.

Resultado: **177 tests, 0 failures, 0 errors**.

| Suite | Tests |
| --- | ---: |
| `ActividadControllerTest` | 8 |
| `AgendaControllerTest` | 4 |
| `EventoControllerTest` | 15 |
| `ImagenControllerTest` | 4 |
| `ImagenServingTest` | 2 |
| `PropuestaControllerTest` | 3 |
| `PublicadorControllerTest` | 10 |
| `ViajeControllerTest` | 14 |
| `ViajeMapperTest` | 4 |
| `PropuestaTuristicaTest` | 11 |
| `EventoRepositoryTest` | 16 |
| `PropuestaRepositoryTest` | 12 |
| `PublicadorRepositoryTest` | 5 |
| `ViajeRepositoryTest` | 4 |
| `ActividadServiceTest` | 9 |
| `AgendaSemanalTest` | 7 |
| `GeocodingServiceTest` | 5 |
| `ImagenServiceTest` | 6 |
| `PropuestaServiceTest` | 23 |
| `PublicadorServiceTest` | 7 |
| `ViajeServiceTest` | 7 |
| `TurismoBackendApplicationTests` | 1 |

Cobertura conceptual:

- Dominio: invariantes, tipos permitidos, transiciones y estados terminales.
- Repositorios: agenda semanal, filtros y orden del listado unificado.
- Servicios: creación, actualización, borrado, geocodificación mockeada, errores.
- Controllers: validación, 404, 422, 409, paginación y contrato JSON.

No cubierto por la suite:

- Llamadas reales a Nominatim.
- Concurrencia real con dos transacciones.
- Arranque con `data.sql` en CI (se verifica manualmente).
- Frontend.

## 9. Incidente de truncado y recuperación

### Qué pasó

Durante el renombre masivo de `EventoService` a `PropuestaService` se ejecutó un script de Python para reemplazar texto en archivos. La línea era equivalente a:

```python
io.open(path, 'w').write(io.open(path).read())
```

En Python, los argumentos se evalúan antes de ejecutar la llamada. Primero se abre el archivo en modo `w` (lo trunca a cero) y recién después se intenta leer. Resultado: **todos los `.java` bajo `src/main` y `src/test` quedaron vacíos**.

### Impacto

- Se perdieron los cambios no commiteados de las fases 0 y 1.
- Los archivos nuevos sin trackear también quedaron vacíos y no podían recuperarse con `git checkout`.
- Al restaurar con `git checkout -- turismo-backend/src`, también se revirtió `data.sql` a HEAD, que todavía tenía el esquema viejo.
- El working tree quedó inconsistente: código nuevo con seed viejo.

### Recuperación

1. `git reset` + `git checkout -- turismo-backend/src` para recuperar los archivos trackeados desde HEAD.
2. Recuperación de snapshots desde `git fsck --lost-found` y desde el historial de la conversación.
3. Reconstrucción manual de entidades, servicios, DTOs, mappers, controllers y tests.
4. Reescritura de `data.sql` para el esquema JOINED.
5. Verificación final: 177 tests y arranque con seed.

### Prevención

- No usar scripts que abran el mismo archivo en modo escritura antes de leerlo. Si se necesita un script, leer primero en memoria, escribir a un archivo temporal y reemplazar al final.
- Preferir las herramientas de edición del proyecto antes que scripts masivos.
- Commitear antes de un renombre o refactor grande.
- Revisar `git status` y `git diff` antes y después de cualquier operación masiva.
- No asumir que `git checkout -- src` solo toca código: también revierte recursos como `data.sql` y `application.properties`.

## 10. Pendientes

### P0 — antes de cerrar la integración

| Pendiente | Por qué | Criterio de aceptación |
| --- | --- | --- |
| Integrar el frontend con `tipo`, `tipoPropuesta`, `modalidad`, `duracionMinutos` y `disponibilidades` | Los contratos cambiaron y el frontend necesita adaptarse | Formularios y listados de eventos/actividades funcionando contra la API nueva. |
| Actualizar o marcar como histórico `HERENCIA-PROPUESTA-TURISTICA.md` | Dice `tipo_propuesta` como discriminador y describe `Disponibilidad` como entidad | El documento viejo apunta a este documento y no contradice el código. |
| Probar un alta real contra Nominatim | La suite usa mocks; el geocoding real puede fallar por dirección, rate limit o red | Alta de evento y actividad con direcciones reales, verificando latitud/longitud. |
| Revisar el uso de `Categoria` en frontend/docs | La entidad fue eliminada | No quedan referencias a `Categoria` ni a `/api/categorias`. |

### P1 — deuda funcional

| Pendiente | Por qué | Criterio de aceptación |
| --- | --- | --- |
| Exponer cambio de estado | `cambiarEstado` existe en el dominio pero no hay endpoint | `PATCH /api/propuestas/{id}/estado` o similar, con transiciones validadas y 400 en inválidas. |
| Test de concurrencia real | El 409 está probado con excepción mockeada | Dos actualizaciones con la misma versión: la segunda recibe 409. |
| Verificar N+1 con `default_batch_fetch_size` | La propiedad está configurada, pero no se midió el impacto | Listado de 50 propuestas con un número acotado de consultas SQL. |
| `@NotNull tipoPropuesta` | Hoy el dominio responde 422 si falta; el frontend debería enviarlo siempre | Agregar validación cuando el frontend esté actualizado y ajustar tests. |
| Imágenes en actividades del seed | Las actividades de demo no tienen imágenes | Al menos una actividad con imagen en `propuesta_imagen`. |

### P2 — deuda técnica

| Pendiente | Por qué | Criterio de aceptación |
| --- | --- | --- |
| Migraciones con Flyway o Liquibase | `create-drop` borra todo en cada arranque; no sirve para producción | Esquema versionado y seed separado por entorno. |
| OpenAPI/Swagger | El contrato está en documentos y tests | Documento generado y accesible en desarrollo. |
| Migrar todos los errores a `ProblemDetail` | Hoy conviven dos formatos | Frontend adaptado y handlers unificados. |
| Revisar nombre de `PropuestaService` | Solo maneja eventos; el nombre puede confundir | Renombrar a `EventoService` o dividir responsabilidades explícitamente. |
| Portabilidad de `data.sql` | Usa `DATEADD`, específico de H2 | SQL compatible con la base objetivo o seed por perfil. |
| Test de arranque con `data.sql` en CI | El seed se valida a mano | Test de integración que levante el contexto con `spring.sql.init.mode=always`. |
| Autenticación/autorización | No hay control de quién publica o edita | Definir alcance con el equipo. |
| Revisar `PropuestaResumenResponse` | Campos nulos por subtipo pueden ser incómodos en TypeScript | Evaluar unión discriminada (`EventoResumen | ActividadResumen`). |

## 11. Guía rápida para el equipo

### Levantar y verificar

```powershell
cd turismo-backend
.\mvnw.cmd clean test
.\mvnw.cmd spring-boot:run
```

La app queda en `http://localhost:8080`.

### Agregar un nuevo subtipo de propuesta

1. Crear la entidad hija con `@Entity`, `@Table` y `@DiscriminatorValue`.
2. Implementar `getTipo()`, `tiposPermitidos()` y `validarInvariantesEspecificas()`.
3. Agregar su repositorio y DTOs.
4. Actualizar `PropuestaSpecifications` si tiene campos propios filtrables/ordenables.
5. Actualizar `PropuestaResumenMapper` y `PropuestaResumenResponse` si necesita columnas nuevas.
6. Agregar tests de dominio, repositorio, servicio y controller.
7. Actualizar `data.sql` si corresponde.

### Errores comunes

- **`mvn test` en vez de `clean test`**: puede usar clases viejas de `target`.
- **Mojibake en consola**: la consola de Windows muestra mal los acentos aunque el archivo esté en UTF-8. Verificar con el editor antes de “corregir”.
- **Seed que no inserta**: revisar que las columnas coincidan con el esquema JOINED y que las subconsultas devuelvan una sola fila.
- **MapStruct “Unmapped target property”**: agregar el `@Mapping(ignore = true)` o el mapeo explícito; no desactivar la política de error.
- **H2 “Check constraint invalid”**: verificar que siga el pin `2.3.232`.

## 12. Glosario

| Término | Significado |
| --- | --- |
| Propuesta turística | Concepto general que puede ser evento o actividad. |
| Evento | Propuesta con fechas, horarios y arancel. |
| Actividad | Propuesta con duración y franjas horarias semanales. |
| Disponibilidad | Franja de un día de la semana con hora de inicio y fin. |
| Publicador | Entidad que publica la propuesta. |
| Estado | Etapa del ciclo de vida de la propuesta. |
| Invariante | Condición que el agregado nunca debería violar. |
| Discriminador | Columna que le dice a JPA qué subtipo instanciar. |
| `treat` | Operación de Criteria que permite acceder a campos de un subtipo. |
| N+1 | Problema de rendimiento por una consulta extra por cada elemento de una colección. |

## 13. Referencias

- [`API-PROPUESTAS-FRONTEND.md`](./API-PROPUESTAS-FRONTEND.md): contratos y ejemplos para el frontend.
- [`HERENCIA-PROPUESTA-TURISTICA.md`](./HERENCIA-PROPUESTA-TURISTICA.md): diseño inicial (histórico).
- [`ONBOARDING.md`](./ONBOARDING.md): guía de inicio del backend.
- [`SPRINT-1.md`](./SPRINT-1.md) y [`SPRINT-2.md`](./SPRINT-2.md): alcance de sprints anteriores.
- `turismo-backend/AGENTS.md`: convenciones y decisiones del backend.
