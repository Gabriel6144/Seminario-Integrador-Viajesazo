# Sprint 2 — Gestión de Viajes (VZ-19 / VZ-21 / VZ-22 / VZ-23)

Planificación para un equipo de 3 integrantes. Alcance: **solo backend** (API REST de
`turismo-backend`, Spring Boot 4.1.1), **2 semanas** (10 días hábiles).

## 1. Alcance y marco

- **Proyecto:** `turismo-backend` (API REST). **Solo backend.**
- **Duración:** 2 semanas (10 días hábiles). **Equipo:** 3 integrantes.
- **Objetivo:** CRUD de la entidad `Viaje` (plantilla de circuito) con **baja lógica** y listado
  de **activos**.
- **Fuera de alcance:** frontend, generación de itinerarios, mapas/rutas/OSRM y autenticación.
- **Restricción transversal:** el contrato de la API se **congela el día 1** y se documenta
  (aunque el frontend no esté en este sprint) para que el equipo de UI pueda seguirlo.

## 2. Historias de usuario → endpoints

| HU | Descripción | Endpoint | Verbo |
| --- | --- | --- | --- |
| **VZ-19** | Registrar viaje | `/api/viajes` | `POST` |
| **VZ-21** | Modificar viaje | `/api/viajes/{id}` | `PUT` |
| **VZ-22** | Consultar viajes activos | `/api/viajes?turistaId=&page=&size=` | `GET` |
| **VZ-23** | Registrar baja de viaje (lógica) | `/api/viajes/{id}` | `DELETE` |
| soporte | Detalle para editar | `/api/viajes/{id}` | `GET` |

Detalle de las historias:

- **VZ-19 – Registrar viaje.** Como turista, quiero registrar mi viaje indicando fechas,
  preferencias, zona de interés, rango de la zona y ritmo del viaje, para definir los criterios
  que se tendrán en cuenta al generar mi circuito turístico.
  - CA1 – Ingreso de datos: fecha de inicio, fecha de fin, preferencias, zona de interés, rango
    de la zona y ritmo del viaje.
  - CA2 – Validación de datos obligatorios.
  - CA3 – La fecha de inicio no debe ser posterior a la fecha de fin.
  - CA4 – Registro exitoso: registra la configuración y la asocia al turista.
  - CA5 – Datos inválidos: informa el error y permite corregirlo antes de registrar.
- **VZ-21 – Modificar viaje.** Como turista, quiero modificar una plantilla del circuito
  guardada, para actualizar preferencias, zona de interés, rango o ritmo.
  - CA1 – Validación de datos obligatorios.
  - CA2 – Registro exitoso y asociación al turista.
  - CA3 – Datos inválidos: informa el error y permite corregirlo antes de modificar.
- **VZ-22 – Consultar viajes activos.** Como turista, quiero tener un listado de mis viajes
  activos, para tener una visualización global de todos mis viajes.
- **VZ-23 – Registrar baja de viaje.** Como turista, quiero registrar la baja de la plantilla
  seleccionada, para evitar su permanencia en mis plantillas activas.
  - CA1 – Antes de dar de baja la plantilla, el sistema debe solicitar confirmación.
  - CA2 – Una vez eliminada, la plantilla no debe poder consultarse como activa.

## 3. Modelo de dominio propuesto (`Viaje`)

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | `Long` | `@GeneratedValue(strategy = IDENTITY)` |
| `turistaId` | `Long` | "asociarla al turista" (ver decisión abierta D1) |
| `fechaInicio` | `LocalDate` | obligatoria (VZ-19 CA2) |
| `fechaFin` | `LocalDate` | obligatoria; `fechaInicio <= fechaFin` (CA3) |
| `preferencias` | `List<Categoria>` o `List<Preferencia>` | ver D2 |
| `zonaInteres` | `String` | ej. `"Valle de Punilla"` (ver D3) |
| `rangoZona` | `Integer` (km) | "rango de la zona" (ver D3) |
| `ritmoViaje` | `enum RitmoViaje` | `RELAJADO / MODERADO / INTENSO` (ver D4) |
| `activo` | `boolean` | `true` por defecto; baja lógica VZ-23 |

Enums y entidades nuevas: `model/Viaje.java`, `model/RitmoViaje.java` (y `model/Preferencia.java`
embebida si se elige D2 con nivel de interés).

## 4. Decisiones transversales

- **Baja lógica (VZ-23).** `DELETE` marca `activo=false` y responde **204**. El listado y el
  detalle solo ven activos; `GET /{id}` de un viaje inactivo devuelve **404**. `PUT` sobre un
  inactivo también devuelve **404**. Es la primera baja lógica del proyecto: **a diferencia de
  `Evento`, cuya baja es física**, y hay que documentarlo de forma explícita.
- **Filtro por turista (VZ-22, "mis viajes").** `GET /api/viajes` filtra por `turistaId` y
  `activo=true`, paginado (`?page`, `?size`, tope 100) y con `PagedModel` anidado igual que el
  resto de los listados.
- **Validaciones.** Obligatorios con Bean Validation (`@NotNull`) sobre `ViajeRequest`
  (CA2/CA5). La regla de fechas va con `BusinessRuleException` en el service, igual que
  `EventoService.validateRange` (CA3).
- **Errores.** Se reutiliza `GlobalExceptionHandler` sin cambios (404 `ResourceNotFoundException`,
  400 `BusinessRuleException`/validación).
- **Nomenclatura.** Dominio en español, código y métodos en inglés; MapStruct
  `componentModel = "spring"` + `unmappedTargetPolicy = ERROR`; `@Transactional` granular
  (escrituras `@Transactional`, lecturas `@Transactional(readOnly = true)`).
- **Confirmación previa (VZ-23 CA1).** Es responsabilidad de la UI (AlertDialog). El backend solo
  expone el `DELETE`; se deja anotado en el contrato.

## 5. Decisiones abiertas a confirmar (antes de arrancar)

| # | Decisión | Recomendación |
| --- | --- | --- |
| D1 | "asociar al turista" sin entidad `Usuario`/`Turista` | `turistaId: Long` opaco (sin FK), filtrable por query. Rework futuro cuando exista auth |
| D2 | Forma de `preferencias` | `List<Categoria>` (simple). La variante con `nivelInteres` (dominio) queda como extensión |
| D3 | Tipo de `zonaInteres` / `rangoZona` | `String` + `Integer` (km). Alternativa: enums de región/radio |
| D4 | Valores de `ritmoViaje` | `RELAJADO / MODERADO / INTENSO` |
| D5 | Inactivo en `GET /{id}` | 404 (no exponer inactivos) |

## 6. Backlog y estimación (persona-días ideales)

Todas las tareas tienen un dueño. **Dev 1, Dev 2 y Dev 3** son los tres integrantes y cada uno
"posee" archivos concretos (ver sección 7): ningún archivo lo tocan dos personas.

| ID | Tarea | Dep. | Est. | Owner |
| --- | --- | --- | --- | --- |
| T0 | Spike de diseño + congelar contrato | — | 0.5 (total) | Dev 1 / Dev 2 / Dev 3 |
| T1 | `Viaje` + `RitmoViaje` (+ `Preferencia`) | T0 | 0.5 | Dev 1 |
| T2 | `ViajeRepository` (derived queries activo/turista) | T1 | 0.5 | Dev 1 |
| T3 | `ViajeRequest` / `ViajeResponse` + validaciones | T0 | 0.5 | Dev 2 |
| T4 | `ViajeMapper` (MapStruct, mapeos explícitos) | T1,T3 | 0.5 | Dev 2 |
| T5 | **VZ-19** POST create + validación de fechas | T1–T4 | 1.0 | Dev 3 |
| T6 | **VZ-21** PUT update | T5 | 0.75 | Dev 3 |
| T7 | **VZ-22** GET listado activos (+ detalle) | T2,T4 | 1.0 | Dev 3 |
| T8 | **VZ-23** DELETE baja lógica | T2,T4 | 0.5 | Dev 3 |
| T9 | Seed de viajes en `data.sql` (fechas relativas) | T1 | 0.5 | Dev 1 |
| T10 | Tests: `ViajeServiceTest` | T5–T8 | 1.0 | Dev 1 |
| T11 | Tests: `ViajeRepositoryTest` | T2,T7,T8 | 1.0 | Dev 1 |
| T12 | Tests: `ViajeControllerTest` (`@WebMvcTest`) | T5–T8 | 1.0 | Dev 2 |
| T13 | Tests: `ViajeMapperTest` | T4 | 0.5 | Dev 2 |
| T14 | Docs: `PRUEBAS-MANUALES.md` (curls medidos) | T5–T8 | 0.4 | Dev 2 |
| T15 | Docs: `README.md` + `turismo-backend/AGENTS.md` | T5–T8 | 0.35 | Dev 3 |
| T16 | Review cruzado + hardening de bordes | Todo | 1.0 | Dev 1 / Dev 2 / Dev 3 |

### Carga por desarrollador

| Dev | Tareas | Carga (pd) |
| --- | --- | --- |
| **Dev 1** | T1, T2, T9, T10, T11 | 3.5 |
| **Dev 2** | T3, T4, T12, T13, T14 | 2.9 |
| **Dev 3** | T5, T6, T7, T8, T15 | 3.6 |

Más T0 (0.25 cada uno) y T16 compartido. Total ≈ 11 pd: holgado en 3 × 10 días.

## 7. Reparto por archivos (ownership exclusivo — sin colisiones)

Regla de oro: **cada archivo tiene un único dueño** y nadie edita un archivo ajeno. Si necesitás
un cambio en un archivo que no es tuyo, lo pedís por el PR de su dueño (o lo pair-programás con
él). Así no hay merges conflictivos ni trabajo pisado.

### Dev 1 — Persistencia y datos

- `model/Viaje.java`
- `model/RitmoViaje.java`
- `model/Preferencia.java` (solo si se elige D2 con nivel de interés)
- `repository/ViajeRepository.java`
- `src/main/resources/data.sql` (seed de viajes)
- `test/.../repository/ViajeRepositoryTest.java`
- `test/.../service/ViajeServiceTest.java`

### Dev 2 — Contrato, mapeo y verificación web

- `dto/request/ViajeRequest.java`
- `dto/response/ViajeResponse.java`
- `mapper/ViajeMapper.java`
- `test/.../mapper/ViajeMapperTest.java`
- `test/.../controller/ViajeControllerTest.java`
- `PRUEBAS-MANUALES.md`

### Dev 3 — Lógica de negocio y API

- `service/ViajeService.java`
- `controller/ViajeController.java`
- `README.md`
- `turismo-backend/AGENTS.md`

### Reglas de no colisión

1. **Un archivo = un dueño.** Se listan arriba y no se solapan (verificado: ningún archivo
   aparece en dos listas).
2. **Los tests viven en archivos separados.** `ViajeServiceTest` (Dev 1) y `ViajeControllerTest`
   (Dev 2) prueban código de Dev 3 sin tocarlo: es verificación independiente, no una colisión.
3. **Contrato congelado el día 1.** Todos programan contra lo acordado en T0 (campos del request
   y response, firmas de `ViajeMapper`, `ViajeService` y endpoints) sin esperar el código del
   otro. Cada uno crea el **esqueleto** de sus archivos ese mismo día.
4. **Ruta crítica:** `model` (Dev 1) → `mapper` (Dev 2) → `service`/`controller` (Dev 3). Para no
   bloquerase, se arranca por el esqueleto y se rellena en paralelo.
5. **Cambios cruzados por PR.** Que Dev 3 necesite un campo nuevo en el DTO no autoriza a Dev 3
   a editarlo: se pide a Dev 2. Lo mismo en sentido inverso.
6. **`rebase` diario contra `develop`** y PRs chicos, uno por tarea, para que los reviews sean
   rápidos.

## 8. Cronograma (2 semanas)

- **Día 1 (medio día):** T0 con los 3 → congelar modelo, contrato (DTO, mapper, service,
  endpoints), errores y decisiones D1–D5. Cada uno crea los **esqueletos** de sus archivos.
- **Día 2:** Dev 1 cierra `Viaje` + enums y arranca el repository; Dev 2 cierra los DTOs y
  arranca el mapper; Dev 3 implementa `create` (T5).
- **Días 3–4:** Dev 1: repository + seed + `ViajeRepositoryTest`; Dev 2: mapper + `ViajeMapperTest`;
  Dev 3: `update`, `findAll`/`findById`, `delete`.
- **Día 5:** PRs (uno por dev) + review cruzado (cada PR ≥ 1 aprobación; el primer PR de cada uno
  **en pareja**).
- **Días 6–7:** Dev 2 `ViajeControllerTest`; Dev 1 `ViajeServiceTest`; Dev 3 cierra endpoints.
  Integración + casos negativos (fechaFin < fechaInicio, id no numérico, inactivo → 404, campos
  obligatorios).
- **Días 8–9:** docs (Dev 2 `PRUEBAS-MANUALES.md`, Dev 3 `README`/`AGENTS`) + hardening.
- **Día 10:** `.\mvnw.cmd clean test` en verde, demo y merge `develop` → `main`.

## 9. Flujo de trabajo (según `CONTRIBUTING.md`)

- Ramas desde `develop`: `feat/viaje-create`, `feat/viaje-update`, `feat/viaje-list`,
  `feat/viaje-soft-delete`, `test/...`, `docs/...`.
- PR **hacia `develop`**, mínimo 1 aprobación, *squash merge*.
- Commits con Conventional Commits en español: `feat: agrega alta de viaje`, `fix: ...`.
- **Verificación obligatoria antes del review:** `.\mvnw.cmd clean test` (siempre `clean`, nunca
  `test` a secas).

## 10. Criterios de aceptación → tests

| CA | Test que lo cubre |
| --- | --- |
| VZ-19 CA1/CA4 | `ViajeControllerTest` POST 201 + `ViajeServiceTest` create |
| VZ-19 CA2 | `@Valid` sobre `ViajeRequest` → 400 campo faltante |
| VZ-19 CA3 | `ViajeServiceTest` `fechaInicio > fechaFin` → `BusinessRuleException` |
| VZ-19 CA5 | `ViajeControllerTest` body inválido → 400 |
| VZ-21 CA1/CA2/CA3 | `ViajeServiceTest` update + 404 |
| VZ-22 | `ViajeRepositoryTest`/`ViajeControllerTest` solo activos, paginado, filtro `turistaId` |
| VZ-23 CA1/CA2 | `ViajeServiceTest` delete marca `activo=false`; `GET` posterior → 404 |

## 11. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Modelo ambiguo (preferencias/zona/rango/ritmo) | Spike T0 día 1 + decisiones D1–D5 confirmadas |
| "Turista" sin entidad `Usuario` | `turistaId` opaco; documentar como deuda |
| Baja lógica ≠ baja física de `Evento` | Documentar la inconsistencia a propósito en `AGENTS.md` |
| Choques de merge en service/controller | Ownership por método + PRs chicos + rebase diario |
| Trampas Boot 4 / Jackson 3 / MapStruct | Seguir `AGENTS.md`; los mappers rompen compilación si falta un mapeo |
| Frontend sin adaptar | Congelar y documentar el contrato en `PRUEBAS-MANUALES.md` |

## 12. Definition of Done

- [ ] `.\mvnw.cmd clean test` en verde (83 actuales + los nuevos).
- [ ] Endpoints documentados con curl en `PRUEBAS-MANUALES.md`.
- [ ] `README.md` y `turismo-backend/AGENTS.md` actualizados (modelo, baja lógica, pendientes).
- [ ] Nomenclatura y estilo respetados (tabulaciones, dominio en español).
- [ ] Cada PR con al menos una aprobación.
