# Decisiones de integración full-stack — circuitos automáticos

> **Alcance:** integración de circuitos (VZ-25) entre backend y frontend, incluido el snapshot
> enriquecido, el planificador, el detalle/mapa y “Mis viajes”.
> **Estado:** implementado y verificado en working tree.
> **Fecha:** 2026-10-27.
> **Rama:** `devGaby`; sin commit ni PR todavía.
>
> Este documento explica **por qué** quedó así la integración. Las reglas del motor y el contrato
> detallado siguen en [`CIRCUITOS-AUTOMATICOS.md`](./CIRCUITOS-AUTOMATICOS.md); las decisiones
> generales del Sprint 3, en
> [`CAMBIOS-Y-DECISIONES-SPRINT-3.md`](./CAMBIOS-Y-DECISIONES-SPRINT-3.md). Si hay diferencias,
> manda el código y, para el motor, `CIRCUITOS-AUTOMATICOS.md`.

## 1. Resumen

La integración resuelve tres problemas que estaban separados:

1. **Backend:** el circuito generado no tenía todos los datos visuales y de ubicación que la UI
   necesitaba. El detalle y los mapas dependían de datos mockeados o de otra consulta.
2. **Frontend:** el planificador mostraba circuitos de ejemplo y no el resultado real de la API.
3. **Listado:** “Mis viajes” tenía que mostrar borradores y viajes ya confirmados sin inventar un
   endpoint nuevo.

La solución fue guardar un **snapshot enriquecido** por ítem en el backend y hacer que el frontend
consuma ese snapshot mediante **un único adaptador** API → UI. El planificador persiste el viaje
antes de generar el circuito, reutiliza el `id` si algo falla y no vuelve a generar ni a
seleccionar dos veces.

## 2. Flujo completo

```text
Planificador (pasos 1–8)
  ├─ si hay borrador: PUT /api/viajes/borradores/{id}
  │                    POST /api/viajes/borradores/{id}/completar
  └─ si no hay borrador: POST /api/viajes
                              ↓
                    POST /api/viajes/{id}/circuito        (201; una sola vez)
                              ↓
                    GET /api/viajes/{id}/circuito         (tres alternativas)
                              ↓
                    POST /api/viajes/{id}/circuito/seleccion (200; una sola vez)
                              ↓
                    GET /api/viajes?usuario=              (“Mis viajes”)
```

El paso 9 del planificador es solo animación. El paso 10 aparece cuando terminaron los mensajes
**y** llegó la respuesta del backend. La animación no decide el resultado.

### Dos respuestas parecidas que no son iguales

| Consulta | Forma | Uso |
| --- | --- | --- |
| `GET /api/viajes/{id}` | `circuito: { estrategia, alternativa, ... }` (singular) | Detalle del viaje ya confirmado. |
| `GET /api/viajes/{id}/circuito` | `estrategiaSeleccionada` + `alternativas[]` (plural) | Reabrir el comparador del planificador. |

En `types/api.ts` son `CircuitoResponse` y `GeneracionCircuitoResponse`. No castear una en la otra.

## 3. Contrato que el equipo debe respetar

### 3.1 Endpoints

| Método | Ruta | Respuesta esperada |
| --- | --- | --- |
| `POST` | `/api/viajes` | `201`; el viaje queda `PLANIFICADO`. |
| `POST` | `/api/viajes/borradores` | `201`; borrador con `interesesCategoria`. |
| `POST` | `/api/viajes/borradores/{id}/completar` | `200`; pasa el borrador a viaje. |
| `POST` | `/api/viajes/{id}/circuito` | `201` con las tres alternativas. |
| `GET` | `/api/viajes/{id}/circuito` | `200` con las alternativas guardadas. |
| `POST` | `/api/viajes/{id}/circuito/seleccion` | `200` con la alternativa elegida. |
| `GET` | `/api/viajes?usuario=` | `200`; alimenta “Mis viajes”. |

### 3.2 Nombres de intereses

No se unificaron los nombres de los campos:

- `POST/PUT /api/viajes` usa **`intereses`**.
- `POST/PUT /api/viajes/borradores` usa **`interesesCategoria`**.

**Decisión:** no agregar `@JsonAlias` ni castear un payload de borrador a `ViajeRequest`. El
planificador arma cada payload por separado (`buildViajeRequest()` y `buildDraftPayload()`) desde
la misma selección de la UI. Un alias escondería el error y el backend respondería `400` con “la
lista de intereses no puede estar vacía”.

### 3.3 Snapshot por ítem

Cada `CircuitoItemResponse` expone, además de los campos del motor:

- `imagenes`
- `ciudad`, `localidad`, `direccion`, `lugarRecinto`
- `latitud`, `longitud`
- `tipoAcceso`
- `montoEstimado`, `descripcionArancel`, `sitioOficial`
- `duracionMinutos`

Estos campos se copian al generar. No se resuelven con una segunda consulta a la propuesta.

## 4. Decisiones de backend

### 4.1 Snapshot denormalizado en `CircuitoItem`

| Decisión | Motivo | Alternativa descartada | Consecuencia |
| --- | --- | --- | --- |
| Guardar los datos visuales y de ubicación en el ítem del circuito. | El circuito es una **instantánea** de lo que se generó: debe sobrevivir a cambios o bajas de la propuesta. | Leer la propuesta original en cada `GET` o hacer un `JOIN` al detalle. | Se duplica información, pero el detalle y los mapas no dependen de otra consulta ni de que la propuesta siga existiendo. |

El snapshot original ya guardaba nombre, descripción, categoría, fecha, orden, horario, traslado y
disponibilidad. La integración agregó los campos que faltaban para dibujar la UI real.

### 4.2 `ProposalDetails` como detalle inmutable del candidato

- `CircuitCandidate.ProposalDetails` agrupa los datos enriquecidos que el motor necesita
  transportar sin conocer JPA ni Spring.
- `ProposalDetails.empty()` existe para tests y para candidatos sin detalle; evita `null` en el
  camino del generador.
- `ScheduledProposal` propaga `details`.
- `CircuitGenerator` copia `candidate.details()` al ítem programado.
- `CircuitoService` persiste y mapea esos datos a la respuesta.

**Por qué:** el motor sigue siendo determinista y testeable sin base de datos. El `CircuitoService`
es el único que conoce entidades y persistencia.

### 4.3 Mapeo null-safe

`CircuitoService` arma la respuesta tolerando campos ausentes:

- listas de imágenes vacías, no `null`;
- coordenadas opcionales;
- montos y duraciones opcionales;
- textos opcionales.

**Por qué:** el seed y los tests pueden tener propuestas incompletas, y una propuesta editada
puede haber perdido un dato. La API no debe romper con `NullPointerException`.

### 4.4 Orden de los ítems

`CircuitoAlternativa.items` se ordena con **`@OrderBy("orden ASC")`**.

**No usar `@OrderColumn` sobre `orden`.** `CircuitoItem.orden` ya es una columna real; un
`@OrderColumn(name = "orden")` duplica la columna, al releer la lista llegan elementos `null` y la
respuesta explota. Lo cubre `CircuitoRepositoryTest`.

### 4.5 Generación y selección únicas

- La generación es única por viaje: un segundo `POST /circuito` responde `400`.
- La selección es única: un segundo `POST /seleccion` responde `400`.
- La generación guarda las **tres** alternativas para comparar.
- Solo la alternativa seleccionada se expone dentro de `GET /api/viajes/{id}`.
- Si una propuesta se da de baja, el ítem se conserva y se marca `disponible=false`; no se
  reubican las demás paradas.
- Si se edita el viaje, la instantánea se conserva sin recalcular.

**Por qué:** comparar y elegir es una decisión del turista; regenerar automáticamente rompería la
comparación y los datos que ya vio.

### 4.6 Disponibilidad y ventana horaria

- La ventana diaria es `06:00–23:59`.
- Un evento sin horario ocupa `09:00–18:00`.
- El traslado desde la parada anterior tiene que caber antes del inicio.
- El ritmo limita a 2, 3 o 4 paradas por día (`TRANQUILO`, `EQUILIBRADO`, `INTENSIVO`).

**Decisión de copy:** los traslados se estiman con Haversine a **30 km/h**. El frontend habla de
“traslado” o “auto”; no de “a pie”. La respuesta informa `distanciasEstimadas=true` y no promete
ruteo real por calles.

### 4.7 Fuera de alcance: VZ-27

No se implementó edición manual, reordenamiento, sustitución, eliminación ni regeneración de
paradas. En la UI esos botones quedan deshabilitados con “Próximamente” para no fingir una acción
que el backend no persiste.

## 5. Decisiones de frontend

### 5.1 `circuito-view-model.ts` es el único adaptador API → UI

`toCircuitoRecomendado` transforma `CircuitoAlternativaResponse` en el modelo que consumen el
paso 10, el detalle y los mapas:

- ordena los ítems por `fecha` y `orden`;
- agrupa por `fecha` y arma `days` / `stopsByDay`;
- calcula la duración de cada parada y el resumen del día;
- resuelve imagen o placeholder;
- deduplica las partes de la ubicación;
- expone `latitud`/`longitud` y `disponible`.

`buildMapStops` y `firstDayWithStops` alimentan los mapas. El detalle y los mapas **no** vuelven a
leer campos de la propuesta ni usan datos mockeados.

**Por qué:** si la API cambia, se ajusta un solo archivo. Antes cada componente interpretaba la
respuesta a su manera y quedaban datos falsos en pantalla.

### 5.2 Se eliminaron los mocks de circuitos

`constants.ts` ya no contiene circuitos, paradas, alternativas ni `DAYS_DATA`. Los componentes
reciben la respuesta real. Esto evita que un test o una demo “funcione” mostrando datos que la API
nunca devolvió.

### 5.3 El viaje se persiste antes de generar

`startCircuitGeneration`:

1. Si hay `borradorId`, actualiza el borrador, lo completa y usa el viaje resultante.
2. Si no, crea un viaje con `POST /api/viajes`.
3. Guarda `tripId`.
4. Recién ahí llama a `POST /api/viajes/{id}/circuito`.

**Por qué:** el circuito necesita un viaje persistido. Si la generación falla, el viaje ya quedó
guardado y el reintento reutiliza `tripId`; no se duplica el alta.

### 5.4 La animación no decide el resultado

- El paso 9 muestra cuatro mensajes cada 1100 ms.
- Solo se pasa al paso 10 cuando terminó la animación **y** llegó la respuesta.
- Un error cancela el intervalo y el timeout, muestra un toast y vuelve al paso 8.

**Por qué:** una animación fija no puede representar una request que tarda más o menos. El
resultado siempre manda.

### 5.5 Fallback ante “ya fue generado”

Si el backend responde `400` porque el circuito ya existe, el planificador hace
`GET /api/viajes/{id}/circuito` y muestra el circuito guardado. No vuelve a generar.

**Por qué:** un reintento después de una respuesta perdida no debe dejar al usuario sin ver el
resultado que el backend ya persistió.

### 5.6 Guarda de `handleSaveDraft`

Si `tripId !== null`, el viaje ya está guardado. En ese caso:

- se muestra “Tu viaje ya está guardado”;
- se navega a “Mis viajes”;
- **no** se crea otro borrador ni se intenta actualizar un borrador ya completado.

Si no hay `tripId`, se actualiza el borrador existente o se crea uno nuevo según `borradorId`.

**Por qué:** cerrar el planificador después de generar creaba un duplicado o intentaba actualizar
un borrador que ya se había completado. `isTripSaved` se deriva de `tripId !== null`, no de un flag
aparte.

### 5.7 Selección única y pestañas de vista

- `useSeleccionarCircuito` actualiza la caché del circuito y las consultas de viajes.
- El botón de confirmar se deshabilita cuando `estrategiaSeleccionada !== null`.
- Cambiar de pestaña solo cambia `activeStrategy` (qué alternativa se ve), **no** selecciona.
- Si ya hay una seleccionada, confirmar abre el modal de éxito sin volver a llamar a la API.

**Por qué:** comparar y seleccionar son acciones distintas. Que el usuario mire otra alternativa
no debe confirmarla.

### 5.8 Detalle y mapas con datos reales

- El detalle usa los días y paradas del adaptador.
- Las pestañas de días son dinámicas, no `DAYS_DATA`.
- El mapa general usa `buildMapStops` / `firstDayWithStops`.
- El mapa de una parada usa su número, duración y coordenadas reales.
- Se eliminó el rating, el hotel y el “a pie” inventados.
- Si faltan coordenadas, se usa un fallback visual; si falta la imagen, un placeholder.
- Sustituir/eliminar están deshabilitados hasta VZ-27.

### 5.9 “Mis viajes” usa el listado general

`/borradores` consume `GET /api/viajes?usuario=`, no `/api/viajes/borradores`.

- El listado devuelve borradores y viajes confirmados.
- `esCircuitoConfirmado(viaje)` es `estado !== 'BORRADOR'`.
- Los confirmados muestran “Circuito confirmado” y no ofrecen descartar ni “continuar
  planificando”.
- Los borradores conservan progreso, descarte y continuación.

**Por qué:** se evita un endpoint nuevo solo para la UI y se reutiliza el listado que ya existía.
El estado del viaje es la fuente de verdad, no un flag de la tarjeta.

### 5.10 Caché e invalidaciones

- `queryKeys.viajesAll()` / `queryKeys.circuitosAll()` agrupan listados.
- Crear viaje invalida borradores y viajes.
- Completar o descartar un borrador invalida borradores y viajes y elimina el detalle.
- Generar un circuito guarda la respuesta en la caché e invalida `circuitosAll`.
- Seleccionar actualiza la caché e invalida `viajesAll`.

**Por qué:** “Mis viajes” y el planificador comparten datos; sin invalidar, una tarjeta podía
seguir mostrando un estado viejo después de confirmar.

### 5.11 MSW replica el ciclo completo

El store de tests soporta:

- `POST /api/viajes`;
- `GET /api/viajes` con filtro por `usuario` antes de paginar;
- `POST/GET /api/viajes/:id/circuito`;
- `POST /api/viajes/:id/circuito/seleccion`.

El fixture `CIRCUITO` incluye las tres estrategias, paradas y snapshot visual/de ubicación.
`BORRADORES` incluye un viaje confirmado además de un borrador para cubrir “Mis viajes”.

**Por qué:** sin estado, el test del paso 10 no podría verificar la selección ni el listado mixto.

## 6. Bordes y limitaciones conocidas

| Caso | Comportamiento actual |
| --- | --- |
| Generación repetida | `400`; el frontend hace `GET` y muestra lo guardado. |
| Segunda selección | `400`; la UI deshabilita el botón. |
| Propuesta dada de baja | El ítem queda con `disponible=false`; no se reubica. |
| Sin coordenadas | Se usa un fallback visual en el mapa; el dato real no se inventa. |
| Sin imagen | Se usa el placeholder de `circuito-view-model.ts`. |
| Viaje confirmado | No se puede descartar ni continuar desde “Mis viajes”. |
| Usuario demo | El frontend usa `turista_demo`; los viajes del seed usan emails (`turista.demo@viajesazo.com`, etc.) y no aparecen en “Mis viajes”. Para una demo con datos precargados hay que alinear el seed o el usuario. |
| VZ-27 | Edición, reordenamiento, sustitución, eliminación y regeneración no implementados. |

## 7. Verificación ejecutada

### Backend

```powershell
cd turismo-backend
.\mvnw.cmd -q "-Dtest=CircuitGeneratorTest,CircuitoServiceTest,ViajeControllerTest,CircuitoRepositoryTest" test
```

Resultado: **39/39 tests en verde** (`7 + 8 + 23 + 1`).

### Frontend

```powershell
cd turismo-frontend
npm run typecheck
npm run lint
npm run build
npm test -- --run
```

Resultado:

- `typecheck`: sin errores.
- `build`: correcto.
- `lint`: solo warnings preexistentes.
- Suite completa: **182 tests / 173 en verde / 9 preexistentes** (8 de `eventos-page` y 1 de
  `evento-editar-page`). Los 9 no son de esta integración.

### Documentación

```powershell
git diff --check
```

Sin errores de whitespace.

## 8. Pendientes y deuda

- Commit y PR de la integración.
- VZ-27: edición manual, reordenamiento, sustitución, eliminación y regeneración.
- Autenticación real; hoy `usuario` es un `String` y el frontend usa `turista_demo`.
- Alinear el usuario demo con los viajes del seed si se quiere una demo con datos precargados.
- Migraciones de base de datos para producción (`create-drop` sigue siendo el modo de desarrollo).
- Resolver los fallos preexistentes de frontend y backend.
- Evaluar ruteo real (OSRM) si los traslados estimados con Haversine no alcanzan.

## 9. Checklist para revisores

Antes de tocar esta integración, verificar que no se rompa:

- [ ] El snapshot guarda los campos visuales y de ubicación; no se leen de la propuesta en el
      `GET`.
- [ ] `CircuitoAlternativa.items` usa `@OrderBy("orden ASC")`, no `@OrderColumn`.
- [ ] La generación y la selección siguen siendo únicas.
- [ ] `GET /api/viajes/{id}` y `GET /api/viajes/{id}/circuito` no se confunden.
- [ ] `intereses` e `interesesCategoria` siguen separados.
- [ ] El planificador persiste el viaje antes de generar y reutiliza `tripId`.
- [ ] `handleSaveDraft` corta si `tripId !== null`.
- [ ] `circuito-view-model.ts` sigue siendo el único adaptador API → UI.
- [ ] “Mis viajes” usa `GET /api/viajes?usuario=` y distingue por `estado`.
- [ ] Los botones de VZ-27 siguen deshabilitados.

## 10. Referencias

- [`CIRCUITOS-AUTOMATICOS.md`](./CIRCUITOS-AUTOMATICOS.md): reglas del motor, snapshot y contrato.
- [`CAMBIOS-Y-DECISIONES-SPRINT-3.md`](./CAMBIOS-Y-DECISIONES-SPRINT-3.md): decisiones generales
  del Sprint 3.
- [`API-PROPUESTAS-FRONTEND.md`](./API-PROPUESTAS-FRONTEND.md): contratos de propuestas.
- [`PRUEBAS-MANUALES-POSTMAN.md`](./PRUEBAS-MANUALES-POSTMAN.md): pruebas manuales de circuitos.
- `turismo-backend/AGENTS.md`: convenciones y trampas del backend.
- `turismo-frontend/AGENTS.md`: convenciones y trampas del frontend.
