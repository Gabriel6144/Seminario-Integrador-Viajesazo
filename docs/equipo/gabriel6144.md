# Bitácora — Gabriel (@Gabriel6144)

- **Área:** Backend / integración full-stack
- **Foco:** modelo de dominio, API REST, persistencia, filtros, integración con el frontend y documentación técnica
- **Ramas habituales:** `Backend`, `main`, `develop`, `backend/*`, `feat/*`, `fix/*`, `docs/*`
- **Última actualización:** 2026-11-10

> Una entrada por PR o tarea relevante, en orden cronológico inverso. Cada entrada registra qué se hizo, por qué se tomó cada decisión y cómo se verificó. Los merges de trabajo ajeno se documentan como integración, sin atribuirse el código.

## Índice

| Fecha | Hito | Referencia |
|---|---|---|
| 2026-11-10 | Ajustes del generador de circuitos y seed ampliado | `8686ab0` |
| 2026-11-09 | Sprint 4: circuitos VZ-25, VZ-26, VZ-29, VZ-28 y cierre | `542f4a3` |
| 2026-10-27 | Integración full-stack de circuitos y “Mis viajes” | `devGaby`, working tree |
| 2026-10-25 | VZ-18: agenda turística server-side | working tree, sin commit |
| 2026-10-24 | Animación del mapa al cambiar el destino | `4437abd` |
| 2026-10-23 | Planificador OSM: pasos 4 y 5 | `dd684c7` · PR #11 |
| 2026-10-22 | Máquina de estados del viaje | `f7fedc8` · PR #10 |
| 2026-10-21 | VZ-13: propuestas turísticas y herencia | `0b2ffb4` · PR #8 |
| 2026-10-18 | Integración de `ramaFront` en `sbrito` | `0578892`, `525ab9b`, `ebda93c` · PR #7 |
| 2026-10-13 | OpenStreetMap, imágenes y accesibilidad | `b445adb` |
| 2026-10-12 | Cierre backend Sprint 2: CRUD de viajes | `bb19870` · PR #5 |
| 2026-10-11 | Contrato inicial de `Viaje` e integración de PR #3 | `7ecb5d1` · PR #4 |
| 2026-10-10 | Planificación Sprint 2 y flujo de PR | `f958918`, `faf7bd5` · PR #2 |
| 2026-10-08 | Integración del PR #1 de `sbrito` | `4f4dbab` |
| 2026-09-27 | Base del repositorio y Sprint 1 | `40fc87a` |

## 2026-11-10 — Ajustes del generador y seed ampliado

- **Sprint / US:** Sprint 4 / VZ-25
- **Rama / PR:** `devGaby`; commit local `8686ab0`, sin push ni PR
- **Estado:** implementado, verificado y documentado

**Qué hice**

- Agregué compactación diaria en `CircuitGenerator`: si la estrategia deja un día bajo
  el tope, inserta propuestas no usadas en los huecos, reordena, renumera `orden` y
  recalcula traslados y `distanciaTotalKm`.
- Corregí el borde de medianoche: los cálculos pasan a minutos desde medianoche
  (`minuteOfDay`) para que `23:59 + traslado` no envuelva a `00:xx`; regresión en
  `CircuitGeneratorTest`.
- Amplié el seed a 57 eventos y 7 actividades (todas con imagen), 55 ubicaciones y
  5 viajes; ajusté horarios de Oktoberfest, Teleférico, Museo Estancia Jesuítica,
  Trekking y Museo Manuel de Falla para que entren en el circuito.
- Actualicé `AGENTS.md` y `CIRCUITOS-AUTOMATICOS.md` con la compactación, el cálculo
  en minutos y los nuevos conteos.

**Verificación**

- Los 5 viajes del seed llenan su tope diario, sin solapamientos y con imágenes.
- Backend: **263 tests, 261 en verde**; siguen los 2 fallos preexistentes
  (`ViajeMapperTest`, `ViajeTest`).
- Frontend: **191 tests, 182 en verde**; los 9 fallos de `eventos-page` y
  `evento-editar-page` son preexistentes y ajenos a este cambio.

**Pendientes / deuda**

- Push y PR del commit.
- Resolver los fallos preexistentes de backend y frontend.

## 2026-11-09 — Sprint 4: circuitos VZ-25, VZ-26, VZ-29, VZ-28 y cierre

- **Sprint / US:** Sprint 4 / VZ-25, VZ-26, VZ-29, VZ-28
- **Rama / PR:** `devGaby`; commit local, sin push ni PR
- **Commit(s):** `542f4a3`
- **Estado:** implementado, probado a mano, documentado y commiteado

**Qué hice**

- Separé los endpoints de circuito en `CircuitoController` (`/api/viajes/{id}/circuito`);
  `ViajeController` queda solo con el CRUD y la vista del viaje, y sus tests de circuito se
  movieron a `CircuitoControllerTest`.
- VZ-25:
  - Exigí intereses no vacíos y filtré candidatos de forma estricta por `interesesCategoria`
    además del radio de interés.
  - Reemplacé el `400` de datos faltantes por `422` con `datosFaltantes: []`
    (`CircuitoDataMissingException` + `ErrorResponseWithMissingData`).
  - Si no hay candidatos elegibles, respondo `422` y no persisto un circuito vacío.
  - Implementé la regeneración: `409` (`ConfirmationRequiredException`) sin
    `?reemplazar=true`; con el flag reemplaza las alternativas y conserva la estrategia
    seleccionada si sigue existiendo.
  - Agregué un snapshot de generación en `Circuito` (fechas, zona, radio, ritmo e intereses) y
    expuse `desactualizado` + `motivosDesactualizacion` (`FECHAS`, `PREFERENCIAS`, `ZONA`,
    `RITMO`) en `CircuitoResponse`.
  - Agregué `itemId` a `CircuitoItemResponse`.
- VZ-26:
  - Nuevo `GET /api/viajes/{id}/circuito/seleccionado` que devuelve
    `CircuitoSeleccionadoResponse` agrupado en `dias[]`, incluye días vacíos (`items: []`),
    ordena por `horaInicio` y usa `orden` como desempate; `404` si no hay viaje, circuito o
    selección.
  - Nuevos DTO `CircuitoSeleccionadoResponse`, `DiaCircuitoResponse` y
    `AlternativaItemResponse`.
  - En el frontend, creé la página `/viajes/:id/circuito` (`circuito-page.tsx`) con vista día
    por día, banner de desactualizado y regeneración.
  - La tarjeta del viaje confirmado ahora muestra “Ver circuito” y navega a la página.
  - Agregué `useCircuitoSeleccionado` y la query key `['circuito', viajeId, 'seleccionado']`.
  - En el planificador agregué el botón “Regenerar” y `PlanificadorRegenerateModal`; el hook
    `useGenerarCircuito` acepta `{ viajeId, reemplazar }` y maneja `409`/`?reemplazar=true`.
  - Actualicé tipos, fixtures, handlers MSW, store y tests (página del circuito, regeneración en
    el planificador y enlace en “Mis viajes”).
- VZ-29:
  - Nuevo `DELETE /api/viajes/{id}/circuito/seleccionado/items/{itemId}?confirmar=true`; valida
    viaje, circuito, alternativa seleccionada y pertenencia del ítem antes de exigir la
    confirmación, para no devolver un `409` engañoso por un ítem ajeno.
  - La baja es física sobre la colección (`orphanRemoval`), renumera `orden` por día, recalcula
    solo el traslado del ítem siguiente y recalcula `distanciaTotalKm`, `afinidadIntereses` y
    `categoriasCubiertas`. Un día vacío se sigue devolviendo y el circuito no se borra.
  - En el frontend agregué el botón de eliminar por parada con `AlertDialog` de confirmación,
    `useEliminarParadaCircuito`, el `apiDelete` genérico que tolera cuerpo de respuesta y la
    actualización de la caché del circuito seleccionado.
- VZ-28:
  - Nuevos `GET /api/viajes/{id}/circuito/seleccionado/items/{itemId}/alternativas` y
    `PUT /api/viajes/{id}/circuito/seleccionado/items/{itemId}` con
    `{ propuestaId }`; los DTO son `AlternativasReemplazoResponse`,
    `AlternativaReemplazoResponse` y `ReemplazoItemCircuitoRequest`.
  - El servicio reutiliza la elegibilidad de candidatos y filtra por bloque horario completo,
    solapamiento con otros ítems del día, disponibilidad, intereses estrictos, radio y traslados
    factibles desde el ítem anterior y hacia el siguiente. Excluye propuestas ya presentes en la
    alternativa y deja una opción por propuesta, ordenada por nombre.
  - El `PUT` revalida la propuesta, pisa la parada y recalcula el traslado siguiente y las
    métricas. Una propuesta inválida responde `422` y no toca la parada; sin `propuestaId`
    responde `400`. Si no hay opciones, el `GET` devuelve `200` con `alternativas: []` y un
    `mensaje`.
  - En el frontend agregué “Sustituir” por parada, un selector de alternativas con `AlertDialog`,
    `useAlternativasReemplazo` y `useReemplazarParadaCircuito`, con estados de carga, error,
    vacío y confirmación deshabilitada hasta elegir una opción.
  - Actualicé tipos, fixtures (`ALTERNATIVAS_REEMPLAZO`), handlers MSW, store
    (`replaceCircuitoItem`, `findCircuitoItem`) y tests de la página.
- Documenté el alcance y las fases en `docs/sprint4/DEFINICION-CIRCUITOS.md` y actualicé los
  `AGENTS.md` de backend y frontend con las cuatro historias y la verificación de la Fase 4.
- Fase 5 (cierre):
  - Corrí el flujo manual completo en Postman (generar, seleccionar, consultar seleccionado,
    listar alternativas, reemplazar, eliminar con/sin confirmación, errores `400`/`404`/`409`/`422`
    y regeneración con `?reemplazar=true`) y verifiqué que el circuito regenerado conserva la
    estrategia y recalcula días, traslados y métricas.
  - Encontré y corregí un falso positivo de `desactualizado` por escala de `BigDecimal`: las
    columnas de snapshot tenían `scale=7` y `Ubicacion` `scale=8`, así que `Objects.equals` marcaba
    `ZONA` al instante. Alineé el mapeo a `scale=8` y comparé con `compareTo` (`sameDecimal()`),
    con regresión en `CircuitoServiceTest`.
  - Actualicé `CIRCUITOS-AUTOMATICOS.md`, `PRUEBAS-MANUALES-POSTMAN.md`,
    `turismo-backend/PRUEBAS-MANUALES.md`, `turismo-backend/AGENTS.md` y la verificación de la
    Fase 5.

**Decisiones**

- `CircuitoController` propio y URL pública sin cambios: cohesión del recurso, tests más chicos y
  `ViajeController` libre de la dependencia de circuitos.
- Intereses estrictos + radio: las estrategias (`CERCANIA`, `INTERESES`, `DESCUBRIMIENTO`) solo
  ordenan el conjunto elegible, no lo amplían.
- Córdoba se asume por invariante de los datos cargados; no se agrega un filtro de provincia.
- La confirmación de regeneración es mixta: el backend responde `409` y la UI reintenta con
  `?reemplazar=true`. Cancelar no modifica nada.
- El snapshot en `Circuito` permite detectar si el circuito quedó viejo sin regenerar
  automáticamente; la decisión de regenerar queda en el usuario.
- Regenerar descarta reemplazos o eliminaciones manuales previas e intenta conservar la
  estrategia seleccionada.
- El circuito seleccionado se consulta en un endpoint propio y no reutilizando el `GET` de
  alternativas: la vista necesita días agrupados, incluidos los vacíos, y el estado de
  desactualización.
- Autenticación real diferida: no se simulan `401/403` ni se agrega `usuario` a los endpoints de
  circuito; queda deuda para la historia de auth.
- El frontend no reagrupa por día ni descarta días vacíos: el backend ya devuelve `dias[]`
  ordenados.
- En la eliminación, la validación de pertenencia va antes que el flag de confirmación: así un
  ítem de otra alternativa da `404` y no un `409` que sugeriría que el problema es la falta de
  confirmación.
- La eliminación física y el recálculo de un solo traslado (el del ítem siguiente) evitan un
  borrado lógico que obligaría a filtrar en todas las consultas y un recálculo global innecesario.
- Para el reemplazo, una propuesta que no encaja se rechaza con `422` y la parada queda intacta:
  es un fallo de invariante, no una confirmación pendiente.
- Las alternativas se filtran con las mismas reglas de elegibilidad que la generación, pero con
  el bloque del ítem como restricción adicional. La UI no decide compatibilidad: solo muestra lo
  que el backend ya validó.
- Se reutilizó `AlertDialog` como selector de alternativas en vez de agregar un componente
  `dialog`/radio group de shadcn: el proyecto ya lo usa para confirmaciones y el footer con un
  `Button` normal permite esperar el `PUT` sin cerrar el diálogo.
- La bitácora consolida VZ-25/VZ-26/VZ-29/VZ-28 en una sola entrada porque las cuatro historias
  comparten el mismo working tree sin commit.
- Las coordenadas del snapshot se comparan por valor y no con `Objects.equals`: `BigDecimal.equals`
  incluye la escala, y una diferencia de representación no es un cambio real de zona.

**Archivos principales**

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/controller/CircuitoController.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/controller/ViajeController.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/request/ReemplazoItemCircuitoRequest.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/response/{CircuitoItemResponse,CircuitoResponse,CircuitoSeleccionadoResponse,DiaCircuitoResponse,AlternativaItemResponse,AlternativaReemplazoResponse,AlternativasReemplazoResponse}.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/exception/{GlobalExceptionHandler,ConfirmationRequiredException,CircuitoDataMissingException,ErrorResponseWithMissingData}.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Circuito.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/CircuitoService.java`
- `turismo-backend/src/test/java/com/viajesazo/turismo_backend/{controller/CircuitoControllerTest,controller/ViajeControllerTest,service/CircuitoServiceTest}.java`
- `turismo-frontend/src/types/api.ts`
- `turismo-frontend/src/api/{circuitos,queries}.ts`
- `turismo-frontend/src/router.tsx`
- `turismo-frontend/src/pages/{circuito-page,circuito-page.test,planificador-page,planificador-page.test,borradores-page.test}.tsx`
- `turismo-frontend/src/lib/http.ts`
- `turismo-frontend/src/components/planificador/{planificador-regenerate-modal,paso-10-circuito,circuito-view-model}.tsx`
- `turismo-frontend/src/components/viaje-borrador-card.tsx`
- `turismo-frontend/src/test/{fixtures,handlers,store}.ts`
- `docs/sprint4/DEFINICION-CIRCUITOS.md`
- `turismo-backend/AGENTS.md`
- `turismo-frontend/AGENTS.md`

**Verificación**

- Backend: **258 tests, 256 en verde**; 2 fallos preexistentes
  (`ViajeMapperTest.mapsRequestToEntity` y `ViajeTest.rejectsPastStartDate`).
  `CircuitoControllerTest` (17) y `CircuitoServiceTest` (26) en verde, incluidos alternativas,
  reemplazo, `400`/`404`/`422`, eliminación, recálculo de métricas y la regresión de escala
  decimal de `desactualizado`.
- Prueba manual en Postman: flujo completo en verde, incluido `409` sin confirmación/regeneración y
  `422` de reemplazo inválido sin tocar la parada.
- Frontend: `npm run typecheck` OK; `npm run lint` OK con 6 warnings preexistentes;
  `npm test -- --run` → **191 tests, 182 en verde** y 9 fallos preexistentes (`eventos-page` ×8
  y `evento-editar-page` ×1). `circuito-page.test.tsx` (8) en verde.
- `git diff --check`: sin errores.

**Pendientes / deuda**

- Push y PR de VZ-25/VZ-26/VZ-29/VZ-28.
- Autenticación y propiedad de viajes para `401/403`.
- La provincia de Córdoba sigue siendo un invariante del dato, sin filtro geográfico.
- Regenerar descarta ediciones manuales previas de reemplazos/eliminaciones.
- Resolver los fallos preexistentes de backend y frontend.

## 2026-10-27 — Integración full-stack de circuitos y “Mis viajes”

- **Sprint / US:** Sprint 3 / VZ-25
- **Rama / PR:** `devGaby`; cambios en working tree, sin commit ni PR todavía
- **Commit(s):** ninguno; base `7770833` (merge de `develop` en `devGaby`)
- **Estado:** implementado y verificado, pendiente de commit

**Qué hice**

- Enriquecí el snapshot del circuito en el backend: `CircuitCandidate.ProposalDetails`,
  propagación por `ScheduledProposal`, copia en `CircuitGenerator` y persistencia en
  `CircuitoItem` de imágenes, ciudad, localidad, dirección, recinto, coordenadas, tipo de acceso,
  monto, arancel, sitio oficial y duración.
- Extendí `CircuitoItemResponse` y ajusté `CircuitoService` para mapear los campos nuevos de forma
  null-safe, sin depender de otra consulta a la propuesta.
- Actualicé los tests de generación, servicio, controller y repositorio del circuito.
- Reconecté el frontend mergeado al contrato real:
  - extendí `types/api.ts`;
  - creé `circuito-view-model.ts` como único adaptador API → UI;
  - reescribí el paso 10, el detalle, el mapa general y el mapa de cada parada;
  - eliminé los circuitos, paradas y alternativas hardcodeadas de `constants.ts`.
- Rehíce el flujo del planificador: persistir el viaje, reutilizar `tripId`, completar el borrador
  si existe, generar una sola vez y caer a `GET /circuito` si el backend responde “ya fue
  generado”.
- Corregí `handleSaveDraft` para que no cree un borrador duplicado después de persistir el viaje.
- Cambié “Mis viajes” a `GET /api/viajes?usuario=` y distinguí borradores de circuitos confirmados
  con `estado !== 'BORRADOR'`.
- Actualicé fixtures, handlers MSW y tests del planificador, del adaptador y de “Mis viajes”.
- Documenté el flujo y las decisiones en `docs/DECISIONES-INTEGRACION-CIRCUITOS.md`, además de
  actualizar los documentos transversales del sprint.

**Decisiones**

- El circuito guarda un **snapshot denormalizado** en `CircuitoItem` en lugar de leer la propuesta
  original en cada consulta. Así el detalle y los mapas sobreviven a ediciones o bajas de la
  propuesta, a costa de duplicar datos.
- `ProposalDetails` es inmutable y tiene `empty()` para tests; el motor sigue sin conocer Spring ni
  JPA y `CircuitoService` es el único que persiste y mapea.
- `CircuitoAlternativa.items` se ordena con `@OrderBy("orden ASC")`; no se usa `@OrderColumn` sobre
  `orden` porque duplica la columna y rompe la recarga con elementos `null`.
- La generación y la selección son únicas. El frontend reutiliza el viaje ya creado y, ante un
  `400` por “ya generado”, lee el circuito existente en vez de duplicar o regenerar.
- El viaje se persiste antes de generar. Si la generación falla, el reintento reutiliza `tripId`.
- `handleSaveDraft` corta si `tripId !== null`: muestra “Tu viaje ya está guardado” y navega a “Mis
  viajes”. Sin esa guarda se creaba un duplicado o se intentaba actualizar un borrador ya
  completado.
- “Mis viajes” usa el listado general `GET /api/viajes?usuario=` en vez de un endpoint nuevo; el
  estado del viaje (`estado !== 'BORRADOR'`) decide si es borrador o circuito confirmado.
- `circuito-view-model.ts` es el único adaptador API → UI: agrupa por fecha, arma días/paradas,
  calcula duración, resuelve imagen/placeholder y alimenta los mapas. Ya no hay mocks de circuitos.
- Sustituir y eliminar paradas quedan deshabilitados con “Próximamente” porque VZ-27 no está
  implementado en el backend.
- Los traslados son Haversine a 30 km/h y el copy habla de “traslado”/“auto”, no de “a pie”.
- No se agregó `@JsonAlias` entre `intereses` (viajes) e `interesesCategoria` (borradores): el
  planificador arma cada payload por separado.
- Queda documentada una limitación de demo: el frontend usa `turista_demo`, mientras que los viajes
  del seed usan emails (`turista.demo@viajesazo.com`, etc.), así que no aparecen en “Mis viajes”
  sin alinear el seed o el usuario.

**Archivos principales**

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/circuit/CircuitCandidate.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/circuit/ScheduledProposal.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/circuit/CircuitGenerator.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/CircuitoItem.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/response/CircuitoItemResponse.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/CircuitoService.java`
- `turismo-backend/src/test/java/com/viajesazo/turismo_backend/{circuit/CircuitGeneratorTest,service/CircuitoServiceTest,controller/ViajeControllerTest,repository/CircuitoRepositoryTest}.java`
- `turismo-frontend/src/types/api.ts`
- `turismo-frontend/src/components/planificador/circuito-view-model.ts`
- `turismo-frontend/src/components/planificador/{types,constants}.ts`
- `turismo-frontend/src/components/planificador/{paso-10-circuito,circuito-detalle-view,circuito-mapa-general-view,parada-ubicacion-mapa-view}.tsx`
- `turismo-frontend/src/pages/planificador-page.tsx`
- `turismo-frontend/src/pages/borradores-page.tsx`
- `turismo-frontend/src/components/viaje-borrador-card.tsx`
- `turismo-frontend/src/api/{circuitos,queries,viajes}.ts`
- `turismo-frontend/src/test/{fixtures,handlers,store}.ts`
- `turismo-frontend/src/pages/planificador-page.test.tsx`
- `turismo-frontend/src/components/planificador/circuito-view-model.test.ts`
- `turismo-frontend/src/pages/borradores-page.test.tsx`
- `docs/DECISIONES-INTEGRACION-CIRCUITOS.md`
- `docs/CIRCUITOS-AUTOMATICOS.md`
- `docs/CAMBIOS-Y-DECISIONES-SPRINT-3.md`
- `docs/PRUEBAS-MANUALES-POSTMAN.md`
- `turismo-backend/AGENTS.md`
- `turismo-frontend/AGENTS.md`

**Verificación**

- Backend targeted:
  `.\mvnw.cmd -q "-Dtest=CircuitGeneratorTest,CircuitoServiceTest,ViajeControllerTest,CircuitoRepositoryTest" test`
  → **39/39 en verde** (`7 + 8 + 23 + 1`).
- Frontend: **182 tests / 173 en verde / 9 fallos preexistentes** (8 de `eventos-page` y 1 de
  `evento-editar-page`).
- `npm run typecheck`: sin errores.
- `npm run build`: correcto.
- `npm run lint`: solo warnings preexistentes.
- `git diff --check`: sin errores.

**Pendientes / deuda**

- Commit y PR de la integración.
- VZ-27: edición, reordenamiento, sustitución, eliminación y regeneración de paradas.
- Alinear `turista_demo` con los usuarios del seed si se quiere una demo con viajes precargados.
- Autenticación real y reemplazo de `usuario` como `String`.
- Resolver los fallos preexistentes de backend y frontend.
- Evaluar ruteo real con OSRM si Haversine no alcanza.

## 2026-10-25 — VZ-18: agenda turística server-side

- **Sprint / US:** Sprint 3 / VZ-18
- **Rama / PR:** `Backend`; cambios en working tree, sin commit ni PR todavía
- **Commit(s):** ninguno; trabajo pendiente de commit
- **Estado:** en curso

**Qué hice**

- Agregué `GET /api/agenda` con filtros por ubicación, rango de fechas, tipo de propuesta, modalidad, categoría y precio máximo.
- Implementé `PropuestaSpecifications` para reutilizar los filtros de propuestas y sumar:
  - búsqueda de ubicación sin distinguir tildes (`ubicacion`);
  - exclusión de propuestas canceladas (`notCancelled()`).
- Implementé `PropuestaQueryService.searchAgenda(...)` con `Clock` inyectable, rango de fechas inclusivo/solapado y orden fijo por fecha de inicio, hora y nombre.
- Agregué `AgendaController` separado de `PropuestaController`, reutilizando el detalle existente de eventos.
- En el frontend, agregué `useAgenda` y adapté la página para filtrar en el servidor en lugar de traer todo y filtrar en memoria.
- Generalicé `groupByDay` para que pueda agrupar eventos y actividades.
- Agregué el handler de MSW para `/api/agenda` y tests de la página.

**Decisiones**

- La agenda es un endpoint propio y no una variante de `/api/eventos/semanal`, porque el semanal responde a otra necesidad del Sprint 1.
- La agenda muestra eventos y actividades, pero no propuestas canceladas.
- `fechaDesde` tiene como valor por defecto el día actual; una propuesta se incluye si su rango se solapa con el rango pedido.
- El orden se define en el backend para que la paginación sea estable; el frontend no reordena.
- El detalle de una propuesta se sigue resolviendo con el endpoint existente de eventos.

**Archivos principales**

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/controller/AgendaController.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/PropuestaQueryService.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/repository/PropuestaSpecifications.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/PropuestaFiltro.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/controller/PropuestaController.java`
- `turismo-frontend/src/api/agenda.ts`
- `turismo-frontend/src/pages/agenda-page.tsx`
- `turismo-frontend/src/lib/group-by-day.ts`
- `turismo-frontend/src/test/handlers.ts`
- `turismo-frontend/src/pages/agenda-page.test.tsx`
- `docs/API-PROPUESTAS-FRONTEND.md`
- `docs/PRUEBAS-MANUALES-SPRINT-3.md`
- `docs/CAMBIOS-Y-DECISIONES-SPRINT-3.md`
- `turismo-backend/AGENTS.md`
- `turismo-frontend/AGENTS.md`

**Verificación**

- Backend: `207` tests ejecutados, `5` fallos preexistentes (`PropuestaTuristicaTest` ×4 y `ActividadServiceTest` ×1 por `tiposPermitidos`), ajenos a la agenda.
- Frontend: `177` tests ejecutados, `9` fallos preexistentes (`eventos-page` ×8 y `evento-editar-page` ×1).
- `npm run lint`: solo warnings preexistentes.
- `npm run typecheck`: sin errores.
- `git diff --check`: sin errores.

**Pendientes / deuda**

- Commit y PR de VZ-18.
- Resolver los fallos preexistentes de `tiposPermitidos` y de las pantallas de eventos.
- Confirmar si la agenda debe incluir propuestas finalizadas además de las activas.

## 2026-10-24 — Animación del mapa al cambiar el destino

- **Sprint / US:** Sprint 3, soporte al planificador
- **Rama / PR:** `Backend`; commit local sin push
- **Commit(s):** `4437abd`
- **Estado:** local, un commit por delante de `origin/Backend`

**Qué hice**

- Agregué la animación del mapa cuando cambia el destino elegido en el paso 4 del planificador.
- Acompañé el cambio con una prueba en `paso-4-destino.test.tsx`.

**Decisiones**

- La animación se resuelve en el componente del mapa y no en la página, para mantener el comportamiento encapsulado.
- No se introdujo una dependencia nueva para animar; se usó la API del mapa ya integrada.

**Archivos principales**

- `turismo-frontend/src/components/planificador/destino-mapa.tsx`
- `turismo-frontend/src/components/planificador/paso-4-destino.test.tsx`

**Verificación**

- Se agregó el test del comportamiento; el commit quedó local y no se empujó.

**Pendientes / deuda**

- Push y PR.
- Validar la animación en un navegador real, no solo en test.

## 2026-10-23 — Planificador OSM: pasos 4 y 5

- **Sprint / US:** Sprint 3, planificador de viaje
- **Rama / PR:** `Backend` · PR #11
- **Commit(s):** `dd684c7`
- **Estado:** mergeado

**Qué hice**

- Implementé el paso 4 con mapa de destino, búsqueda y geocodificación.
- Implementé el paso 5 con selección de radio de interés.
- Agregué constantes y tipos compartidos del planificador.
- Reemplacé el paso 4 anterior de hospedaje por el nuevo paso basado en mapa.
- Conecté ambos pasos con el estado de la página del planificador.
- Agregué tests para los pasos 4 y 5.

**Decisiones**

- El mapa se centra en el destino elegido y el radio se selecciona visualmente.
- La geocodificación se reutiliza desde el backend para no duplicar la integración con Nominatim.
- Los pasos se separan en componentes para que el estado del planificador quede en la página y la presentación en cada paso.

**Archivos principales**

- `turismo-frontend/src/components/planificador/destino-mapa.tsx`
- `turismo-frontend/src/components/planificador/paso-4-destino.tsx`
- `turismo-frontend/src/components/planificador/paso-5-radio.tsx`
- `turismo-frontend/src/components/planificador/constants.ts`
- `turismo-frontend/src/components/planificador/types.ts`
- `turismo-frontend/src/pages/planificador-page.tsx`
- `turismo-frontend/src/components/planificador/paso-4-destino.test.tsx`
- `turismo-frontend/src/components/planificador/paso-5-radio.test.tsx`

**Verificación**

- Tests agregados para ambos pasos.

**Pendientes / deuda**

- Revisar el comportamiento del mapa en mobile.
- Mantener la dependencia de red con Nominatim bajo observación.

## 2026-10-22 — Máquina de estados del viaje

- **Sprint / US:** Sprint 3, ciclo de vida del viaje
- **Rama / PR:** `Backend` · PR #10
- **Commit(s):** `f7fedc8`
- **Estado:** mergeado

**Qué hice**

- Implementé las transiciones de estado del viaje: `BORRADOR → PLANIFICADO → EN_CURSO → FINALIZADO`, con `CANCELADO` como salida permitida desde borrador o planificado.
- Agregué a `Viaje` los métodos de dominio `planificar(Clock)`, `cancelar()`, `validarEditable()` y `actualizarEstadoPorFechas(LocalDate)`.
- Implementé el scheduler de transiciones automáticas por fecha, con propiedad para habilitarlo o deshabilitarlo.
- Conecté el servicio con el scheduler y agregué tests de las transiciones.
- Documenté los estados y los casos de prueba manuales.

**Decisiones**

- Las transiciones viven en el modelo y no en el controller, para que no dependan del transporte.
- `FINALIZADO` y `CANCELADO` son terminales.
- Un viaje planificado pasa a `EN_CURSO` el día de inicio y a `FINALIZADO` el día siguiente al de fin.
- Un viaje en curso, finalizado o cancelado no se puede modificar.
- El scheduler se puede desactivar por configuración para no interferir en tests.

**Archivos principales**

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Viaje.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/EstadoViaje.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/ViajeService.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/scheduler/ViajeEstadoScheduler.java`
- `turismo-backend/src/main/resources/application.properties`
- `turismo-backend/src/test/java/com/viajesazo/turismo_backend/model/ViajeTest.java`
- `turismo-backend/src/test/java/com/viajesazo/turismo_backend/service/ViajeServiceTest.java`
- `docs/ESTADOS-VIAJE-SPRINT-3.md`
- `docs/PRUEBAS-MANUALES-SPRINT-3.md`

**Verificación**

- Tests de transiciones, edición bloqueada y transiciones automáticas.

**Pendientes / deuda**

- Revisar la zona horaria del scheduler en despliegue.
- Definir si se necesita una transición manual para finalizar antes de fecha.

## 2026-10-21 — VZ-13: propuestas turísticas y herencia

- **Sprint / US:** Sprint 3 / VZ-13
- **Rama / PR:** `Backend` · PR #8
- **Commit(s):** `0b2ffb4`
- **Estado:** mergeado

**Qué hice**

- Implementé el modelo de propuestas turísticas con herencia `JOINED`: `PropuestaTuristica` como base y `Evento`/`Actividad` como subtipos.
- Agregué `TipoPropuesta`, `TipoRegistro`, `Modalidad`, `NombreEstado`, `EstadoPropuesta`, `Disponibilidad` y `TipoAcceso`.
- Implementé repositories, specifications, services, controllers, DTOs y mappers para eventos y actividades.
- Agregué datos de prueba en `data.sql`.
- Documenté el contrato de propuestas, la herencia y las decisiones de estados.
- Actualicé la documentación de pruebas y cambios del Sprint 3.

**Decisiones**

- Un listado común de propuestas, con discriminador de tipo, en lugar de endpoints separados por subtipo.
- Herencia `JOINED` para compartir columnas y mantener tablas específicas por subtipo.
- Las invariantes de cada subtipo se validan en el dominio y se traducen a `422`.
- Los estados terminales no admiten edición.
- La disponibilidad y el cupo se modelan como parte de la propuesta.

**Archivos principales**

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/PropuestaTuristica.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Evento.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Actividad.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Disponibilidad.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/NombreEstado.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/repository/PropuestaRepository.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/repository/PropuestaSpecifications.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/PropuestaQueryService.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/controller/PropuestaController.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/mapper/PropuestaMapper.java`
- `turismo-backend/src/main/resources/data.sql`
- `docs/API-PROPUESTAS-FRONTEND.md`
- `docs/CAMBIOS-Y-DECISIONES-SPRINT-3.md`
- `docs/HERENCIA-PROPUESTAS.md`

**Verificación**

- La documentación del commit reporta `177` tests en verde.
- Se agregaron tests de invariantes, transiciones y listado unificado.

**Pendientes / deuda**

- Quedaron fallos preexistentes en `PropuestaTuristicaTest` y `ActividadServiceTest` por `tiposPermitidos`; se documentaron como deuda.

## 2026-10-18 — Integración de `ramaFront` en `sbrito`

- **Sprint / US:** Sprint 2, integración frontend/backend
- **Rama / PR:** `sbrito` · PR #7
- **Commit(s):** `0578892` (merge), `525ab9b` (fix de tests), `ebda93c` (fix de typecheck)
- **Estado:** mergeado

**Qué hice**

- Integré `ramaFront` en `sbrito` y resolví los conflictos de frontend.
- Corregí la sincronización de aserciones en tests.
- Eliminé el bloque legado de ubicación que todavía usaba campos anteriores.
- Corregí los errores de `typecheck` introducidos por el merge.

**Decisiones**

- Mantener la versión del contrato actual de ubicación y no conservar el bloque legado.
- Resolver los conflictos a favor de la estructura de componentes vigente.
- Ajustar los tests al comportamiento real en lugar de relajar la implementación.

**Archivos principales**

- `turismo-frontend/src/pages/eventos-page.tsx`
- `turismo-frontend/src/pages/evento-editar-page.tsx`
- `turismo-frontend/src/components/**`
- `turismo-frontend/src/test/**`

**Verificación**

- Se corrigieron los errores de `typecheck` y las aserciones de tests que fallaban por el merge.

**Pendientes / deuda**

- Los fallos preexistentes de `eventos-page` y `evento-editar-page` quedaron documentados al cierre del Sprint 2.

## 2026-10-13 — OpenStreetMap, imágenes y accesibilidad

- **Sprint / US:** Sprint 2, soporte de eventos
- **Rama / PR:** `Backend`, integrado en PR #7
- **Commit(s):** `b445adb`
- **Estado:** mergeado

**Qué hice**

- Implementé geocodificación con Nominatim: configuración, servicio y cliente HTTP.
- Agregué `WebConfig` para servir archivos estáticos y `ImagenController`/`ImagenService` para subir imágenes.
- Validé tipo real por magic bytes, tamaño máximo y nombre generado con UUID; protegí contra path traversal.
- Agregué `TipoAcceso` y `EstadoPropuesta` al modelo de eventos.
- Incorporé campos nuevos en `EventoRequest`/`EventoResponse` y ajusté el service.
- Agregué selector de ubicación, mapa y subida de imágenes en el frontend.
- Documenté la integración con OpenStreetMap y los cambios del Sprint 1.

**Decisiones**

- La geocodificación se hace en el backend al crear o editar, para que el frontend no dependa de Nominatim.
- Si no se encuentra la ubicación, se responde `400`.
- No se usa API key: Nominatim es público y se respeta su uso con una consulta acotada.
- Las imágenes se guardan como archivos y se exponen como URLs; el contrato sigue usando strings.
- Los archivos se sirven desde `/api/archivos`.

**Archivos principales**

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/config/GeocodingConfig.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/config/WebConfig.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/GeocodingService.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/controller/ImagenController.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/ImagenService.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/TipoAcceso.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/EstadoPropuesta.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/EventoRequest.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/EventoResponse.java`
- `turismo-frontend/src/components/eventos/**`
- `docs/OPENSTREETMAP.md`
- `docs/CAMBIOS-SPRINT-1.md`

**Verificación**

- Tests de geocodificación, servicio de imágenes, servido de imágenes y controller.
- Pruebas manuales de subida y visualización.

**Pendientes / deuda**

- Nominatim depende de red y de sus límites de uso.
- Los archivos huérfanos de imágenes reemplazadas no se limpian automáticamente.

## 2026-10-12 — Cierre backend Sprint 2: CRUD de viajes

- **Sprint / US:** Sprint 2, backend de viajes
- **Rama / PR:** `Backend` · PR #5
- **Commit(s):** `bb19870`
- **Estado:** mergeado

**Qué hice**

- Implementé el CRUD de viajes: crear, listar con paginación, ver detalle, editar y dar de baja.
- Agregué DTOs de request/response, DTOs de ubicación y el mapper de viaje.
- Implementé `ViajeService`, `ViajeRepository` y `ViajeController`.
- Agregué datos de prueba y documentación del Sprint 2.
- Dejé el estado del viaje bajo control del backend.

**Decisiones**

- La baja es lógica: el viaje pasa a `CANCELADO` y deja de listarse.
- `usuario` se mantiene como `String` en esta etapa; la autenticación real queda para el sprint final.
- El cliente no puede imponer `estado` al crear o editar.
- El listado devuelve solo viajes activos.
- Un viaje inactivo responde `404` en detalle y edición.

**Archivos principales**

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/controller/ViajeController.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/ViajeService.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/repository/ViajeRepository.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/mapper/ViajeMapper.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/ViajeRequest.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/ViajeResponse.java`
- `turismo-backend/src/main/resources/data.sql`
- `docs/SPRINT-2.md`

**Verificación**

- La documentación del cierre reporta `112` tests verdes en backend.

**Pendientes / deuda**

- Adaptar el frontend al contrato de viajes.
- Reemplazar `usuario` por el usuario autenticado cuando exista auth.

## 2026-10-11 — Contrato inicial de `Viaje` e integración de PR #3

- **Sprint / US:** Sprint 2, base del dominio de viajes
- **Rama / PR:** `Backend` · PR #4; integró el PR #3 de Joaquín
- **Commit(s):** `7ecb5d1`
- **Estado:** mergeado

**Qué hice**

- Definí `ViajeRequest` y el enum `EstadoViaje`.
- Renombré `Categoria` a `InteresCategoria` para que el concepto sea compartido por eventos y viajes.
- Agregué el modelo de ubicación y los campos de `Viaje` necesarios para el contrato.
- Integré la base del PR #3 de Joaquín sobre la rama de backend.

**Decisiones**

- El nombre `InteresCategoria` representa mejor el uso compartido entre propuestas y viajes.
- La ubicación se modela como un objeto reutilizable, no como campos sueltos.
- El contrato se define antes de implementar service y controller para que el frontend pueda avanzar en paralelo.

**Archivos principales**

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/dto/ViajeRequest.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/EstadoViaje.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/InteresCategoria.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Ubicacion.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Viaje.java`

**Verificación**

- Compilación del contrato y revisión del merge.

**Pendientes / deuda**

- Implementar DTOs, mapper y service (continuado por Thiago y luego por el cierre del Sprint 2).

## 2026-10-10 — Planificación Sprint 2 y flujo de PR

- **Sprint / US:** Sprint 2, coordinación
- **Rama / PR:** `docs/sprint-2` · PR #2
- **Commit(s):** `f958918`, `faf7bd5`
- **Estado:** mergeado

**Qué hice**

- Agregué `CONTRIBUTING.md` con el flujo de ramas, commits y PR.
- Agregué `ONBOARDING.md` para nuevos integrantes.
- Agregué `docs/SPRINT-2.md` con el plan del sprint.
- Creé una rama de prueba y un PR de prueba para validar el flujo.

**Decisiones**

- Ramas cortas por tarea, PR hacia la rama de integración y revisión antes de mergear.
- Commits con prefijo convencional (`feat`, `fix`, `docs`, `test`, `chore`).
- El PR debe incluir qué se hizo, cómo se probó y qué queda pendiente.

**Archivos principales**

- `CONTRIBUTING.md`
- `ONBOARDING.md`
- `docs/SPRINT-2.md`

**Verificación**

- El PR de prueba se abrió y mergeó correctamente.

**Pendientes / deuda**

- Sostener el flujo en los PRs siguientes.

## 2026-10-08 — Integración del PR #1 de `sbrito`

- **Sprint / US:** Sprint 1, integración inicial
- **Rama / PR:** `main` · PR #1 de `sbrito`
- **Commit(s):** `4f4dbab`
- **Estado:** mergeado

**Qué hice**

- Integré el PR #1 de `sbrito`, que traía la base de la interfaz y los datos del frontend.
- Revisé el merge y dejé la rama principal con la base compartida.

**Decisiones**

- Integrar temprano para que el resto del equipo trabaje sobre una base común.

**Archivos principales**

- `turismo-frontend/**`
- `turismo-backend/**`

**Verificación**

- Merge del PR #1.

**Pendientes / deuda**

- Ninguno propio; el código es de `sbrito`.

## 2026-09-27 — Base del repositorio y Sprint 1

- **Sprint / US:** Sprint 1, base técnica
- **Rama / PR:** `main`
- **Commit(s):** `40fc87a`
- **Estado:** mergeado

**Qué hice**

- Dejé la base del repositorio con backend Spring Boot y frontend React/TypeScript.
- Implementé el CRUD inicial de eventos, el listado semanal y el manejo global de errores.
- Agregué DTOs, validaciones, mapper, datos de prueba y documentación inicial.
- Dejé la suite de tests inicial.

**Decisiones**

- Arquitectura por capas: controller, service, repository y modelo.
- Spring Boot 4, MapStruct para mappers y H2 en memoria para desarrollo.
- DTOs separados de entidades para no exponer el modelo de persistencia.
- Respuestas de error uniformes con `@RestControllerAdvice`.
- El listado semanal se resuelve en backend.

**Archivos principales**

- `turismo-backend/**`
- `turismo-frontend/**`
- `docs/**`

**Verificación**

- El commit reporta `83` tests de backend y `120` tests de frontend en verde.

**Pendientes / deuda**

- Autenticación y autorización.
- Actualización y borrado de propuestas por parte del publicador.
- Definir el alcance de los estados y la agenda para los sprints siguientes.

## Cómo mantener esta bitácora

1. Antes de abrir un PR, agregar una entrada al inicio con la fecha, la US y el estado.
2. Al mergear, completar el número de PR y el commit final; si el merge es squash, usar el commit resultante.
3. Si se integra trabajo de otra persona, escribir “integré el PR #X de <autor>” y no atribuirse el código.
4. Mantener los enlaces y nombres de archivo actualizados; si un archivo se renombra, corregir la entrada.
5. Actualizar la fecha de “Última actualización” del encabezado.
