# AGENTS.md

## Contexto

Tesis de facultad: **este proyecto es solo el frontend**. La API REST de Spring Boot vive en
`../turismo-backend` y expone eventos, publicadores, propuestas y agenda. Acá no va código de
servidor ni lógica de negocio: la UI **consume** la API.

Los dos proyectos viven en el **mismo repositorio git**, como subcarpetas. Eso no los hace
acoplados de build: cada uno tiene su `package.json` / `pom.xml` y sus propios comandos.

- Estado actual: Sprints 1–3 completos y **consulta (VZ-26), eliminación (VZ-29), reemplazo
  (VZ-28) y completar día incompleto con sugerencias**. Listados paginados de eventos y
  publicadores, detalle de ambos, agenda (VZ-18), **CRUD de eventos y alta de publicadores**,
  **planificador de viajes con generación y selección de circuitos (VZ-25)**, **página día por
  día del circuito seleccionado con eliminación, reemplazo y sugerencias para días incompletos
  (VZ-26/VZ-28/VZ-29)** y ruta 404. La agenda filtra y pagina en el servidor. El alta/edición de eventos
  soporta **tipo de acceso y arancel** (`GRATUITO` / `DE_PAGO` con monto y link al sitio oficial)
  y **ubicación con mapa** (Leaflet + OpenStreetMap), incluido un **selector de ubicación** con
  buscador y pin arrastrable. **338 tests en 42 archivos (334 en verde, 23/11/2026).** Los 3 que
  fallan son preexistentes y ajenos al circuito: los de `evento-detail-page.test.tsx`; el de
  `planificador-page` de la URL es flaky bajo carga y pasa solo.
- **Autenticación activa:** access JWT en memoria (`src/lib/auth-session.ts`), refresh en cookie
  HttpOnly vía `credentials: 'include'` en `src/lib/http.ts` (single-flight refresh en 401).
  Una cuenta = un rol. Registro elige TURISTA o PUBLICADOR. Guards:
  `RequireAuth` / `RequireRole` / `RequireNotAdmin` / `RequireNotPublicadorTour`.
  Shells: admin `/admin`+`/usuarios`; publicador `/publicador` + `/publicador/agenda`
  (sin Inscriptos ni agenda turística/planificar/mis viajes). En **Propuestas** (`/propuestas`)
  el publicador solo ve las suyas (`?publicadorId=`); turista/admin ven el catálogo.
  Contrato: `../docs/seguridad/AUTENTICACION-Y-AUTORIZACION.md`.
- **Páginas públicas:** `/` es **Inicio** y `/sobre-nosotros` la historia institucional. Viven
  fuera del `Layout` operativo (no anidan `<main>`) y reutilizan `TopAppBar` (logo y clima) con
  `ViajezasoLayout showHeader={false}`. **Sobre nosotros es solo para visitantes:** con sesión
  iniciada, `RequireGuest` redirige a `/propuestas` y el enlace se oculta en el header y en el
  índice de la portada. El listado pasó de `/` a **`/propuestas`**; todo enlace de
  "volver al listado" apunta ahí. El personaje es **Rumbi** (antes Rumin) en textos, clases y
  assets (`rumbi-*.png`). Las demos de agenda/circuito usan datos locales y no escriben la API.
- Para la API ver el `AGENTS.md` y el `PRUEBAS-MANUALES.md` de `../turismo-backend`.

## Comandos

| Tarea | Comando |
| --- | --- |
| Levantar en dev | `npm run dev` |
| Build de producción | `npm run build` |
| Tests | `npm test` |
| Tests en watch | `npm run test:watch` |
| Lint | `npm run lint` |
| Solo tipos | `npm run typecheck` |

`npm run build` ya corre `tsc -b` antes de `vite build`: un typecheck fallado rompe el build.
No hace falta correr `typecheck` aparte antes de entrar.

## La API y sus trampas

Todo sale de `/api` y va por el proxy de Vite. **Nunca hardcodear
`http://localhost:8080`**: el backend no tiene CORS y el proxy es lo que hace que el navegador
vea las requests como same-origin. En producción hay que poner un proxy inverso delante o
agregar `CorsConfiguration` en el backend.

Cosas que se olvidan fácil y ya están resueltas en el código, para no volver a romperlas:

- **`Page` viene anidada**: los metadatos están en `page.size` / `page.number` /
  `page.totalElements` / `page.totalPages`, no en el nivel superior. Es la `PagedModel` de
  Spring Data 4.x (Boot 4), distinta del `Page` clásico.
- **`LocalDate` no va por `new Date(iso)`**: `"2026-10-01"` se parsea como medianoche UTC y en
  Argentina (UTC-3) se muestra 30 de septiembre. Toda fecha se arma por componentes en
  `src/lib/dates.ts`.
- **`LocalTime` siempre trae segundos**: `"20:00:00"`, aunque valgan cero (verificado contra la
  API real). Para mostrar se recorta a `HH:mm`.
- **Un id no numérico da 500, no 400**: los controllers no tienen `@Validated`, así que la
  conversión de la path variable cae en el catch-all. `src/lib/parse-id.ts` valida antes de
  pedir y la vista muestra un mensaje honesto.
- **`content: []` con 200 es una respuesta válida**, no un error: publicador sin eventos, base
  recién arrancada. Es estado vacío, se maneja distinto al error.
- **La agenda filtra en el servidor**: `useAgenda` manda `fechaDesde`/`fechaHasta`,
  `tipoPropuesta`, `categoria`, `ubicacion`, `tipoAcceso`, `page` y `size` a `GET /api/agenda`.
  El cliente no vuelve a filtrar ni a ordenar: el backend ya devuelve solo eventos no cancelados,
  ordenados por fecha/hora, y pagina. `keepPreviousData` evita el parpadeo al cambiar de página.
- **El catálogo (`/propuestas`) también filtra en el servidor.** `usePropuestas` manda `q`,
  `ciudad`, `localidad`, `estado`, `tipoPropuesta`, `categoria`, `fechaDesde/Hasta`,
  `publicadorId` e `incluirCanceladas`; el cliente no vuelve a filtrar la página. Los contadores
  de las píldoras salen de `GET /api/propuestas/resumen` y las zonas del selector de
  `GET /api/propuestas/zonas`. Al cambiar cualquier filtro se vuelve a `page=0`.
- **`/api/agenda` no es la agenda semanal**: la semanal (`/api/agenda/semanal`, US6) va de hoy al
  domingo y no acepta filtros; su cantidad de eventos depende del día en que se corre la app. La
  agenda turística (VZ-18) usa una ventana abierta y filtros explícitos.
- **El cuerpo de error va en inglés** (`status`, `error`, `message`, `timestamp`) pero el
  **valor** de `message` está en español. El catch-all de 500 filtra el detalle a propósito, así
  que para 500 solo hay un texto genérico: ver `toUserMessage`.
- **Un campo opcional vacío se manda como `null`, nunca como `""`**: `""` no es "sin valor" y
  quedaría como cadena vacía en la base. Ojo con el detalle, que surprisingemente **no** rompe:
  medido contra la API real, Jackson coerciona `""` a `null` en `LocalDate` y `LocalTime`, así que
  mandarlo no da error. En un `LocalTime` sin `@NotNull` el alta se guarda con **201** y el
  horario vacío; en un `LocalDate` validado lo agarra el `@NotBlank` y responde
  `fechaInicio: la fecha de inicio es obligatoria`. El 400 genérico de Jackson
  (`el cuerpo de la petición no es válido...`) es para formatos **malformados**: `"no-es-fecha"`
  o una categoría inexistente. `toEventoRequest` y `toPublicadorRequest` hacen la conversión en un
  solo lugar.
- **`DELETE /api/eventos/{id}` responde 204 sin cuerpo**: `response.json()` contra eso tira
  `SyntaxError` y el usuario vería un error de red después de una baja exitosa. `readBody` tolera
  el cuerpo vacío.
- **En un PUT, `imagenes: []` borra y `imagenes: null` conserva**: es la regla del mapper del
  backend. El formulario manda siempre un array, nunca `null`, para que quitar la última imagen
  la borre de verdad.
- **`publicadorNombre` viene aplanado**: es un JOIN del backend, no un campo del DTO de entrada.
  No se manda al crear ni al editar.
- **`ViajeRequest` y `ViajeBorradorRequest` no comparten el nombre de los intereses**:
  `POST/PUT /api/viajes` usa `intereses`; `POST/PUT /api/viajes/borradores` usa
  `interesesCategoria`. El planificador arma ambos desde `buildViajeData()`; no castear un payload
  de borrador a `ViajeRequest`, porque el backend responde `400` con “la lista de intereses no
  puede estar vacía”. El handler de MSW valida `intereses` para que el test lo detecte.
- **El alta/edición de un evento geocodifica de verdad**: el backend resuelve
  `lugarRecinto + direccion + localidad` con Nominatim (OpenStreetMap) y **rechaza con 400** si no
  encuentra la ubicación (`no se encontró la ubicación del evento: ...`). O sea, crear o editar un
  evento **necesita que el backend tenga internet y que la dirección exista**. `lugarRecinto`,
  `localidad` y `direccion` son obligatorios por eso. El 400 llega como banner, igual que el resto
  de los errores del servidor.
- **`tipoAcceso` / arancel**: `DE_PAGO` exige `montoEstimado` y `sitioOficial` (URL `http(s)`);
  `GRATUITO` los ignora. `estadoPropuesta` **no se manda** (lo fija el server en `INICIADO`).
  Cambiar a `GRATUITO` limpia el arancel en `toEventoRequest` para no dejar un monto colgado.
- **El email duplicado responde 400 con un string plano** (`"ya existe un publicador con ese
  email"`), no con errores por campo. `PublicadorService` lo anticipa con `existsByEmail` para dar
  un mensaje claro en vez del error de constraint de H2.

## Planificador y circuitos (VZ-25)

`src/pages/planificador-page.tsx` orquesta los pasos 1–10. Los pasos 1–8 son el wizard; el 9 es la
animación de generación y el 10 muestra las tres alternativas reales.

- **El viaje se persiste antes de generar.** `startCircuitGeneration` completa el borrador o crea
  el viaje, guarda `tripId` y recién ahí llama a `POST /api/viajes/{id}/circuito`. Si la generación
  falla, el viaje ya quedó guardado: el reintento reutiliza `tripId` y no duplica el alta.
- **La animación no decide el resultado.** El paso 9 muestra cuatro mensajes cada 1100 ms, pero
  solo se pasa al 10 cuando terminó la animación **y** llegó el circuito. Un error cancela el
  intervalo, muestra toast y vuelve al paso 8.
- **La generación es única.** Si el backend responde `409` con "ya fue generado" (por ejemplo, al
  reintentar), el page hace un `GET` del circuito existente y lo muestra. Regenerar exige el modal
  de confirmación y manda `?reemplazar=true`; descarta ediciones manuales previas.
- **La selección también es única.** `useSeleccionarCircuito` actualiza la caché del circuito; la
  UI deshabilita el botón cuando `estrategiaSeleccionada !== null`. Cambiar de pestaña solo cambia
  la vista (`activeStrategy`), no selecciona.
- **`isTripSaved` se deriva de `tripId !== null`**, no de un flag aparte. El botón de guardado
  cambia a "Ver en Mis viajes" cuando el viaje ya existe.
- **No se guarda otro borrador después de persistir el viaje.** `handleSaveDraft` corta si
  `tripId !== null` y navega a Mis viajes; de lo contrario, con `borradorId` actualiza y sin él
  crea un borrador nuevo. Sin esa guarda, cerrar el planificador después de generar creaba un
  duplicado (o intentaba actualizar un borrador ya completado).
- **`buildViajeRequest` mapea los intereses de la UI a `InteresCategoria`** con `INTEREST_MAP`;
  `interests` en el estado guarda los labels visibles. El `pasoActual` que se manda es el `step`
  actual.
- `useCircuito` existe para reabrir un circuito desde un viaje guardado; el flujo del wizard usa
  las mutaciones de generación/selección.
- **`circuito-view-model.ts` es el único adaptador API → UI.** `toCircuitoRecomendado` agrupa los
  ítems por `fecha`, arma `days`/`stopsByDay`, resuelve imagen o placeholder y calcula la duración;
  `buildMapStops` y `firstDayWithStops` alimentan los mapas. El detalle y los mapas no deben
  volver a leer campos de la propuesta ni usar los mocks que se quitaron de `constants.ts`.
- **“Mis viajes” usa `GET /api/viajes?usuario=`**, no `/borradores`: el listado trae borradores y
  viajes confirmados. `estado !== 'BORRADOR'` decide si la tarjeta muestra “Circuito confirmado” y
  oculta descartar/continuar. `useViajes` invalida `viajesAll` al crear, completar y descartar.
- **Una sola vista de detalle del circuito** (`CircuitoDiaSplitView`) con `modo`:
  - **`recomendado`**: detalle al abrir “Ver detalle” en Paso10 (planificador o viaje sin
    selección). Misma portada/mapa/scroll-snap, sin sugerencias; **con Sustituir/Eliminar solo
    mientras no hay alternativa elegida** (`selectedStrategy === null`, usa los endpoints
    `/alternativas/{estrategia}/items/...`); barra
    sticky con “Confirmar y guardar circuito” y modal de éxito (`circuito-guardado-modal.tsx`).
  - **`confirmado`** (default): `/viajes/:id/circuito` con Sustituir/Eliminar y completar día.
  - `Paso10Circuito` solo cambia el detalle; el listado de tarjetas de alternativas no se toca.
    Requiere `viajeId` para OSRM. `CircuitoDetalleView` quedó sin usos (no borrado aún).
- **El detalle del viaje NO devuelve `GeneracionCircuitoResponse`**: `GET /api/viajes/{id}` trae
  `circuito: { estrategia, alternativa, ... }` (singular), mientras que
  `GET /api/viajes/{id}/circuito` trae `estrategiaSeleccionada` y `alternativas` (plural). En
  `types/api.ts` son `CircuitoResponse` y `GeneracionCircuitoResponse` respectivamente.
- **MSW replica el ciclo completo**: `POST /api/viajes`, `GET /api/viajes`, `POST/GET
  /api/viajes/:id/circuito` (con `409` y `?reemplazar=true`) y `POST .../seleccion` sobre
  `src/test/store.ts`. El fixture
  `CIRCUITO` trae las tres estrategias con paradas y el snapshot visual/de ubicación; sin ese
  estado, el test del paso 10 no podría verificar la selección. `BORRADORES` incluye un viaje
  confirmado además del borrador para cubrir “Mis viajes”.

## Circuito seleccionado día por día (VZ-26/VZ-28/VZ-29)

`src/pages/circuito-page.tsx` se abre en `/viajes/:id/circuito` (ruta registrada antes de
`/viajes/:id/planificar`). La tarjeta de un viaje confirmado muestra “Ver circuito” y navega ahí.

- **La página consume `GET /api/viajes/{id}/circuito/seleccionado`**, no el `GET` de alternativas:
  `useCircuitoSeleccionado` usa la query key `['circuito', viajeId, 'seleccionado']`. Un `404`
  (sin viaje, sin circuito o sin selección) se muestra como estado de error con “No se pudo cargar
  la información” y botón de reintento.
- **Los días vacíos se renderizan igual**: el backend ya devuelve todos los días del rango y la UI
  muestra “Sin actividades programadas.” cuando `items` está vacío. No agrupar de nuevo en el
  cliente ni descartar días sin paradas.
- **El banner de desactualizado sale de `desactualizado` + `motivosDesactualizacion`**, que solo
  expone este endpoint. “Regenerar” reutiliza `planificador-regenerate-modal` y
  `useGenerarCircuito` con `?reemplazar=true`; al terminar invalida el prefijo `['circuito']`, así
  que la página vuelve a pedir el seleccionado.
- **Eliminar una parada pasa por `EliminarParadaDialog`** (`parada-dialogs.tsx`), que repite el
  nombre, dice cómo queda el día (“Vas a ir de X directo a Y”) y, si `confirmado`, avisa que deja
  de figurar como inscripto. `useEliminarParadaCircuito`
  manda `?confirmar=true`, escribe el `CircuitoSeleccionadoResponse` actualizado en la caché de
  `circuitoSeleccionado` e invalida `['circuito', viajeId]` y `viajesAll`; la fila desaparece sin
  recargar. El `apiDelete` genérico existe porque esta baja devuelve cuerpo, a diferencia del
  `DELETE` de eventos (204).
- **Sustituir una parada (VZ-28) usa `SustituirParadaPanel`** (`sustituir-parada-panel.tsx`,
  `Dialog` de radix) + `SustitucionMapa` (Leaflet). La respuesta es `OpcionesSustitucionResponse`
  (`huecoInicio/huecoFin`, `paradaAnterior/Siguiente`, `opciones[]`, `noEntran[]`, `mensaje`).
  El panel muestra la línea de tiempo del hueco, filtros (todas / me gusta / intereses / otras;
  tipo), orden (recomendadas / cerca / populares), tarjetas con letra A, B, C… y sus motivos,
  “No entran ese día” plegable y pie Antes → Después; el botón es “Sustituir por {letra}”.
  `useAlternativasReemplazo` (confirmado) y `useReemplazosAlternativa` (antes de elegir) piden las
  opciones solo con el panel abierto. **La respuesta se valida**: si `opciones` no es una lista
  (backend sin reiniciar con el formato viejo) no se rompe y muestra un aviso de reiniciar el
  backend. Los tooltips del mapa van con `textContent`, nunca HTML.
- **Días incompletos antes de confirmar.** En el paso 10, con el detalle abierto y sin alternativa
  elegida, `useDiasAlternativa` trae el estado de cada día (`GET .../alternativas/{estrategia}/dias`)
  y `conResumenDeDias` lo pone en el view-model. El aviso ofrece completar con
  `useSugerenciasDiaAlternativa` / `useAgregarParadaSugeridaAlternativa` (mismo
  `CompletarDiaDialog` que el circuito confirmado); "Dejarlo así" solo oculta el aviso en pantalla.
  Sustituir, eliminar y agregar invalidan `queryKeys.alternativa(viajeId, estrategia)`.
- **Días incompletos (fase 4B): la generación no rellena; el usuario decide.** Cada día del
  seleccionado trae `resumen` (`pendiente`, `puedeCompletar`, `agregadasPorUsuario`,
  `avisoDescartado`, `mensaje`). `AvisoDiaIncompleto` en la consulta muestra CTAs solo si
  `puedeCompletar`; en el planificador solo informa. “Ver sugerencias…” abre un `AlertDialog`
  con `useSugerenciasDia` (query solo con el diálogo abierto), agrupadas en
  `OTRO_TIPO` / `OTRA_CATEGORIA`. `useAgregarParadaSugerida` y `useDescartarAvisoDia` escriben el
  `CircuitoSeleccionadoResponse` en caché e invalidan `['circuito', viajeId]` y `viajesAll`. Las
  paradas con `origen === 'SUGERENCIA_ACEPTADA'` muestran el badge “Agregada por vos”.
  `enrichCircuitoConSeleccionado` une `resumen`/`origen` del seleccionado al view-model que sale
  de la generación (imágenes/coords).
- **Sugerencias (22/11/2026).** `MotivoSugerencia` suma `DE_TUS_INTERESES`; `CompletarDiaDialog`
  agrupa "De tus intereses" primero y muestra una sección "No entran ese día" con
  `SugerenciasDiaResponse.noEntran` (opcional en el tipo). El backend ya no sugiere en días
  pasados ni después de "Dejarlo así".
- **Cancelar viaje** (`useCancelarViaje`, baja lógica): botón en la tarjeta de Mis Viajes y en la
  cabecera del circuito confirmado, solo con `estado === 'PLANIFICADO'`; pide confirmación y
  navega a `/borradores`.
- **Exportar PDF estilo Stitch**: `CircuitoPdfPreviewDialog` + `pdfmake` (UMD cargado con `?url`
  sólo al exportar). El resumen es una `ContentSection` **A4 horizontal full-bleed** (842×595,
  márgenes 0), con página blanca, hero de 404×595 y columna derecha del mismo blanco para que no
  quede marco. Hero compuesto como PNG (foto + degradado + textos), timeline con todas las paradas
  y footer del Stitch. Las páginas por día son una sección **A4 vertical** con micro-header, título
  de ruta, badge coral, mapa 7/12 y timeline 5/12. El mapa se captura con MapLibre
  (`circuito-mapa-captura.ts` devuelve la imagen + las coordenadas proyectadas) y se compone en
  `src/lib/circuito-pdf-day-map.ts` con la ruta del día, pines numerados, etiquetas, norte, leyenda
  y escala. La ruta se busca primero en la caché de `rutaQueryKey`; si no está, se pide a OSRM y, si
  falla, no se dibuja línea. Si el mapa falla, cae al SVG (`circuito-svg.ts`). La timeline usa
  píldoras de hora y círculos outline (`buildOutlineBadgeDataUrl`). Debajo del mapa va una
  **galería editorial full width anclada al pie de la página** con hasta 3 tarjetas (foto inclinada
  **por encima** de una cápsula crema con número, hora, título y descripción) y una pastilla “+N
  paradas más”; se compone en canvas en `src/lib/circuito-pdf-day-gallery.ts`. El mapa mide 302×410
  y la timeline tiene más espaciado entre filas. `src/lib/circuito-pdf.ts` arma la definición pura y
  `src/lib/circuito-pdf-day.ts` los datos del día; `src/lib/circuito-pdf-hero.ts` compone el hero y
  los badges; `src/lib/pdf-assets.ts` carga fuentes/logo/hero y las fotos. Las fotos se prueban en
  orden (`loadFirstPhotoDataUrl`) y, si el host no manda CORS, se piden al proxy `wsrv.nl`, que
  devuelve la imagen con CORS y ya redimensionada. El preview es un iframe; no hay opciones de
  diseño.
- **MSW** agrega los handlers `GET /api/viajes/:id/circuito/seleccionado`, `DELETE
  .../items/:itemId`, `GET .../items/:itemId/alternativas`, `PUT .../items/:itemId`,
  `GET/POST .../dias/:fecha/sugerencias|items` y `PUT .../dias/:fecha/aviso`, además de
  los fixtures `CIRCUITO_SELECCIONADO` (viaje `2`, estrategia `INTERESES`,
  `desactualizado: true`, con un día vacío y `resumen` pendiente), `OPCIONES_SUSTITUCION` y
  `SUGERENCIAS_DIA`. `resetStore()` siembra la selección del viaje `2`; los tests cubren
  agrupado por día, regeneración, eliminación, reemplazo, sugerencias (agregar / vacío /
  Dejarlo así / 422) y `404`.

## Vista de detalle del circuito (mapa + scroll-snap)

`CircuitoDiaSplitView` cubre recomendado (Paso10) y confirmado (`/viajes/:id/circuito`). Lista
con **scroll-snap** vertical (una parada por pantalla, `IntersectionObserver` para la activa) y
mapa a la derecha (arriba en mobile).

- **Geometría OSRM a pie** (`src/lib/rutas.ts`): solo `routed-foot` en
  `routing.openstreetmap.de`. Una request por día con todos los waypoints; cola ≥1,1 s;
  timeout 8 s. Hook `useRutaDia` en `src/api/rutas.ts` con `staleTime: Infinity`. La query key
  incluye `estrategia ?? 'seleccionado'` para no mezclar caché entre alternativas del mismo
  viaje. Si falla, línea recta (`geometriaLineaRecta`). No se muestran distancias/tiempos OSRM
  ni `trasladoKm`/`trasladoMinutos` en esta vista (siguen en tipos).
- **“Recorrer el día”** anima el muñequito (`/viajezaso/assets/turista.png`) con
  `routeMetrics`/`sampleRoute` sobre la geometría a pie y sincroniza la lista con las
  distancias acumuladas a lo largo de la ruta.

### Links a Google Maps

`src/lib/google-maps.ts` arma URLs de Directions sin API key y **sin `travelmode`** (el
turista elige el modo en Google). Base `https://www.google.com/maps/dir/?api=1` con
`origin` / `destination` / `waypoints` vía `URLSearchParams` (`%2C`, `%7C`). Coordenadas
`lat,lng` o, si faltan, el texto de dirección (`location`); sin datos no hay link.

- Por tarjeta: “Cómo llegar desde mi ubicación” (primera) o “desde la parada anterior”.
- En el mapa: “Ver el día en Google Maps”; si hace falta, partes. Google Maps en celular
  acepta pocas intermedias: `linksDiaCompleto` parte en tramos de hasta **5 paradas**
  (origen + 3 waypoints + destino), encadenados.

### Mapa 2D/3D de la consulta del circuito

`CircuitoRutaMapa` orquesta una interfaz común `MapaCircuito`
(`mapa-circuito.ts` + `mapa-circuito-leaflet.ts` + `mapa-circuito-maplibre.ts`):
`setRuta`, `setParadas`, `setActiva`, `encuadrarRuta`, `setProgreso`, `destruir`. La
animación y “Recorrer el día” solo hablan con esa interfaz.

- **2D**: Leaflet + OSM, `scrollWheelZoom: false`.
- **3D**: MapLibre on-demand (`import()`), estilo
  `/viajezaso/assets/maps/cordoba-style.json`, pitch 55, `scrollZoom: false`, capa
  `building-3d`. Sin WebGL2 / timeout 14 s / 3 errores / `webglcontextlost` → vuelve a 2D
  con mensaje. La demo de landing (`circuit-map.tsx`) no se modifica.
- Selector **2D | 3D** (`aria-pressed`); preferencia en `localStorage` clave `vz-mapa-modo`.

## Escritura: cómo está armado

| Capa | Dónde | Qué hace |
| --- | --- | --- |
| Schemas y adapters | `src/lib/schemas.ts` | Zod valida; los adapters convierten a `EventoRequest` / `PublicadorRequest`. |
| Formularios | `src/components/*-form.tsx` | RHF + `zodResolver`. Comunes entre alta y edición. |
| Mutaciones | `src/api/eventos.ts`, `src/api/publicadores.ts` | Un hook por verbo. Invalidan caché. |
| Toasts y navegación | Las páginas | Los hooks no saben de `toast` ni de `navigate`. |

Decisiones que conviene no deshacer:

- **Un solo `EventoForm` para alta y edición.** La diferencia son los `defaultValues` y el
  `submitLabel`. Duplicar el formulario garantiza que unArrange de campos se aplique a uno solo.
- **La validación vive en Zod, no en el handler.** Los mensajes coinciden con los del backend a
  propósito: si divergen, el usuario lee dos textos para el mismo error según desde dónde lo
  tocó.
- **Un 400 del servidor se muestra como banner, no por campo**: el backend no devuelve errores
  estructurados. `serverError` va arriba del formulario.
- **Tras crear se navega al detalle del recurso creado** (o al listado tras borrar): quedarse
  en el formulario mostrando un evento que ya existe es confuso, y volver al detalle después de
  borrar mostraría un 404 justo después de una operación exitosa.
- **La baja va detrás de un `AlertDialog`** que repite el nombre del evento: es física, no hay
  forma de deshacerla.
- **Sin publicadores cargados no se muestra el formulario**: sin `publicadorId` es un callejón
  sin salida, así que se avisa con un link al alta.
- **El selector de publicadores pide `size=100`**: es un tope deliberado
  (`PUBLICADORES_MAX_SIZE`). Con más de 100 hay que agregar un buscador o paginar el select.

## Mapa del evento

`src/components/evento-mapa.tsx` muestra la ubicación del evento en el detalle.

- **Leaflet directo, sin `react-leaflet`.** `react-leaflet` no soporta React 19; el wrapper
  nativo son ~30 líneas. Dependencias: `leaflet` + `@types/leaflet`.
- **El mapa se monta a mano en un `useEffect`** (crear `L.map`, tile layer, marcador) sobre un
  `div` con `ref`, y se destruye con `map.remove()` en el cleanup. Leaflet es imperativo: no
  intentar manejarlo con estado de React.
- **`L.map(..., { scrollWheelZoom: false })`**: sin esto, la rueda del mouse sobre el mapa se
  come el scroll de la página.
- **La burbuja del marcador se arma con nodos DOM, no con HTML string**: `bindPopup` acepta un
  `HTMLElement` y así el nombre de la dirección no se interpola como HTML.
- Los tiles son de OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) con la
  atribución obligatoria. El contenedor va con `role="img"` y `aria-label`.
- El detalle pinta la tarjeta del mapa **solo si hay `latitud`/`longitud`**: un evento sin
  coordenadas (no debería pasar, el backend las exige) no rompe la página.
- En tests el mapa se mockea (`vi.mock('@/components/evento-mapa')` en el test del detalle; en el
  test propio del componente se mockea `leaflet` con `vi.hoisted`). jsdom no tiene layout ni
  canvas, así que un Leaflet real ahí revienta.

## Selector de ubicación (formulario)

`src/components/ubicacion-selector.tsx` es el buscador que va en la Sección 3 del alta/edición de
evento, para no tener que tipear `lugarRecinto` / `localidad` / `direccion` a mano.

- **La geocodificación del cliente es solo UX.** El backend vuelve a geocodificar con Nominatim y
  es el que guarda `latitud`/`longitud` (y rechaza con 400 si no encuentra la dirección). El
  buscador no manda coordenadas: solo completa los tres campos de texto que exige `EventoRequest`.
- **No toca `EventoFormValues` ni `toEventoRequest`.** El selector es estado efímero de UI y
  comunica los campos por callbacks (`onLugarRecintoChange` & cia.), que el form enchufa a
  `setValue`. El schema y el contrato de la API quedan igual.
- **`direccion` se arma a nivel calle, nunca con el `display_name`.** `geocoding.ts` toma
  `address.road` (sin el número: con número, la búsqueda free-form de un POI devuelve vacío),
  con fallback a barrio y a la localidad. Mandar el `display_name` entero hacía que el backend,
  que **vuelve a concatenar** los tres campos, arme una query irresoluble → 400. Por eso el
  backend además deduplica (ver el `AGENTS.md` de `../turismo-backend`).
- **Las llamadas a Nominatim viven en `src/lib/geocoding.ts`** (`buscarLugar`,
  `geocodificarInverso`), un helper puro sin React, con la misma regla de "ningún componente hace
  `fetch`". Tolerante a fallos: un error de red devuelve `[]` / `null`, nunca tira.
- **El transporte va por el proxy `/nominatim` de Vite** (`vite.config.ts`), igual que `/api`:
  rutas relativas, nunca el dominio absoluto de OpenStreetMap.
- **El mapa se monta recién cuando hay coordenadas** (un resultado elegido, o el evento en edición
  con `latitudInicial`/`longitudInicial`). Se carga con `lazy()` + `Suspense` para no arrastrar
  Leaflet al bundle inicial. Un alta que no toca la ubicación no carga el mapa.
- **El pin es arrastrable y dispara *reverse geocoding*** al soltarlo, con debounce (default
  1000 ms) para respetar el límite ~1 req/s de Nominatim. La prop `reverseDelayMs` existe para
  bajarlo a 0 en los tests y no esperar un segundo real.
- `src/components/ubicacion-preview-mapa.tsx` es el mapa de preview (Leaflet directo, mismo patrón
  que `evento-mapa.tsx`), separado del buscador para que el `lazy()` tenga un módulo propio.

## Estructura

| Carpeta | Qué va |
| --- | --- |
| `src/api/` | Hooks de TanStack Query, uno por recurso. Son la **única** capa que conoce URLs. |
| `src/lib/` | Puros: `fetch`, fechas, ids, paginación en la URL, agrupado. Sin React. |
| `src/components/` | Presentación. Los `ui/` son de shadcn, no editar a mano. |
| `src/pages/` | Un componente por ruta. Orquestan datos y estados. |
| `src/types/api.ts` | Espejo de los DTO del backend. |
| `src/test/` | Fixtures, handlers MSW, store en memoria, helpers de render. |

Las reglas que sostienen esto:

- **Ningún componente hace `fetch`.** Va por el hook de `src/api/`. Así el `signal` de
  cancelación, la clave de caché y el reintento están en un solo lugar.
- **Los hooks devuelven la `Page` entera**, no solo `content`: la paginación necesita
  `totalElements` y `totalPages`. Desenvolver en el hook repartiría el formato por toda la app.
- **`apiGet` usa rutas relativas a propósito** (ver el proxy arriba).
- **`keepPreviousData` en los listados**: al paginar la grilla no se vacía. Mientras llega la
  nueva, `isPlaceholderData` es `true` y el skeleton va *encima*, no en lugar del contenido.
- **Los cuatro estados son explícitos**: `isPending`, `isError`, `isSuccess` con contenido vacío
  y `isSuccess` con contenido. Ojo con esto: durante `isPending` `data` es `undefined`, así que
  un `data?.content.length === 0` pintado como sibling del skeleton muestra el mensaje de
  "vacío" encima del skeleton. Por eso las páginas usan cadenas `if` sobre `isSuccess`.

## Estado de la página: vive en la URL

El circuito también guarda su estado en la URL para que F5 no saque al usuario de donde estaba:
`?viaje=` en el planificador y `?alternativa=` + `?dia=` en el paso 10 y en
`/viajes/:id/circuito`.

`usePageParam` lee y escribe `?page=`, **base 0 como el backend**. No es `useState` a propósito:
la URL queda compartible, el botón "atrás" funciona y recargar no pierde la posición. La primera
página borra el query param para que `/eventos` se vea más limpio que `/eventos?page=0`.

Mezclar base 0 y base 1 entre la URL y la API es la forma más fácil de meter un off-by-one sin
que se note. Si alguna vez se cambia, cambia en los dos lados.

`PaginationBar` es un componente **puro**: recibe la `Page` y un `onPageChange`, no pide datos.
Por eso se testea sin servidor.

Cuidado con los bordes de la paginación: `pointer-events-none` depende del CSS y
`aria-disabled` no impide el clic, así que la guarda va **explícita en el handler**. Sin ella,
"anterior" en la primera página pide `page = -1`.

## Convenciones

- **Identificadores en inglés, contenido en español**: `useEventos`, `formatDateRange`,
  `parseId`; pero rutas `/api/eventos`, textos de la UI y comentarios en español.
- **Sin `any`.** Los tipos de la API son explícitos en `src/types/api.ts`.
- **Comentarios explican el porqué, no el qué.** Si hay que anotar algo obvio, sobra.
- **Nunca editar `src/components/ui/`**: lo genera shadcn y `shadcn add` / `shadcn update` pisa
  los cambios. Si falta un componente, se agrega con el CLI. `CardTitle` es un `div` fijo sin
  `asChild`: cuando el título tiene que ser un heading de verdad, se compone el `<h2>` a mano.
- **Tokens semánticos de shadcn** (`bg-secondary`, `text-muted-foreground`) en vez de colores
  crudos (`bg-emerald-500`), así el tema funciona en claro y oscuro.
- **Los warnings de `only-export-components` en `ui/badge.tsx` y `ui/button.tsx` se dejan
  como están**: son exports de `cva` del propio shadcn. En los archivos propios sí se separan
  los helpers puros (ver `lib/group-by-day.ts` y `components/day-heading.tsx`). Hay además un
  warning de `react(incompatible-library)` en `evento-form.tsx` por `useForm` de RHF: es
  inherente a la librería, se deja.

## Tests

Vitest + Testing Library + MSW. 338 tests en 42 archivos (334 en verde; 3 en rojo preexistentes de
`evento-detail-page` y el de la URL de `planificador-page`, que es flaky bajo carga). Los mapas
(`circuito-ruta-mapa`, `sustitucion-mapa`) se mockean en los tests de páginas; el PDF mockea
`circuito-pdf-day-map`, `circuito-pdf-day-gallery`, `circuito-mapa-captura` y `obtenerRutaDia`
porque jsdom no tiene canvas/WebGL ni red. `circuito-view-model` cubre el adaptador real,
`borradores-page` el listado mixto borrador/confirmado y `circuito-page` la vista día por día del
seleccionado (días vacíos, regeneración, eliminación confirmada/cancelada, reemplazo, ausencia de
alternativas y cancelación).

- **Nominatim se mockea con handlers MSW** (`/nominatim/search` y `/nominatim/reverse`), igual que
  la API: `onUnhandledRequest: 'error'` no perdona una request real. El test del selector mockea
  `leaflet` con `vi.hoisted` (fábricas encadenables + el callback de `dragend` guardado para
  simular el arrastre del pin) y usa `reverseDelayMs={0}`.

- **MSW corre con `onUnhandledRequest: 'error'`**: una request sin handler falla el test en vez
  de salir a la red. Por eso un test que "funciona" y en realidad pegó a internet no puede pasar.
- **Los handlers de listado paginan de verdad**: leen `?page` y `?size` y cortan. Si devolvieran
  la lista entera siempre, el test de paginación pasaría sin verificar que la página 2 exista.
- **Los handlers de escritura son stately, sobre `src/test/store.ts`.** Un alta o una baja se
  reflejan en los listados siguientes, que es lo que permite testear el flujo entero —crear y
  ver el evento en la grilla— y no solo que se haya hecho un POST. `resetStore()` va en el
  `beforeEach` de los tests que escriben; la copia es profunda para no ensuciar los fixtures.
- **El store replica la regla de imágenes del mapper**: en un PUT, `[]` borra y `null` conserva.
  Si el handler no la respetara, un test de quitar imágenes pasaría sin detectar el bug.
- **Los fixtures copian lo que devuelve la API, no lo que dice `data.sql`**: el seed escribe
  `'20:00'` pero la API responde `"20:00:00"`. Y usan **fechas fijas**, no relativas a
  `CURRENT_DATE` como el seed: los tests tienen que dar lo mismo hoy y en un año.
- `QueryClient` de tests con `retry: false`, `staleTime: 0` y `gcTime: 0`. El default reintenta 3
  veces ante cualquier error: un test de estado de error tardaría tres esperas.
- **Polyfills de Radix en `setup.ts`**: `hasPointerCapture`, `setPointerCapture` y
  `scrollIntoView` no existen en jsdom. Sin ellos, hacer click en un `<Select>` revienta con un
  TypeError en vez de abrir la lista de opciones.
- **Los tests de formulario esperan al campo, no al render**: la página muestra un skeleton
  hasta que cargan los publicadores, así que un `getByLabelText` inmediato corre contra un árbol
  que todavía no existe. `findByLabelText` lo resuelve.
- Los tests se llaman con `screen` por rol o texto, no por clase CSS: los `data-slot` de shadcn
  se reescriben en cada `shadcn add`.

## Detalles de shadcn

Instalado con `style: "radix-nova"`, `baseColor: "neutral"`, iconos `lucide`, alias `@/`.

- `cn` viene del paquete `cn`, no de `lib/utils`. Es lo que generó el CLI.
- **`radix-nova` no tiene el componente Base UI `toast`**: por eso los avisos usan el wrapper
  `ui/sonner.tsx` con el paquete `sonner`, no shadcn `toast`. `Toaster` va montado en `main.tsx`
  y cada página llama a `toast.success` / `toast.error` desde los callbacks de la mutación.
- **`ui/sonner.tsx` importa `next-themes`**, aunque la app no monte un `ThemeProvider`: el
  wrapper de shadcn lo da por hecho y el tema resuelve a `"system"`. Si algún día se agrega
  dark mode, hay que envolver la app en `ThemeProvider` o el `Toaster` se desincroniza.
- **En Windows, shadcn a veces crea una carpeta literal llamada `@`** en vez de resolver el
  alias, si el `tsconfig` raíz no tiene `compilerOptions.paths`. Si aparece, borrarla: el alias
  está en `vite.config.ts` y en `tsconfig.app.json`.
- **No usar `baseUrl`**: TypeScript 6 lo marca como deprecated y deja de funcionar en TS 7.
  `paths` con `"./src/*"` se resuelve contra la carpeta del propio tsconfig.
- Hay un `AGENTS.md` de skills de terceros instalado que puede sugerir cosas que acá no aplican
  (Tailwind v3, `<Routes>` en vez de `createBrowserRouter`). **Las decisiones de este archivo
  pisan al skill.**

## Formularios

`react-hook-form` + `@hookform/resolvers` con **Zod clásico** (`zod@3.25.76`), no Zod 4: la
dependencia raíz quedó en 3.x y las APIs son distintas (`z.string().email()`, no `z.email()`).
Migrar a 4 no es un bump de versión.

- `resolver: zodResolver(schema)` y los `defaultValues` se tipan contra el schema, así que un
  campo nuevo obliga a definirlo en un solo lugar.
- `Controller` solo para los `<Select>` de Radix, que son controlados y no se pueden registrar
  con `register`. Los `<Input>` nativos van con `register`.
- **Los opcionales usan `z.union([z.literal(''), z.enum(...)])`** o `z.string()`: el `''` es el
  "sin valor" de HTML y el adapter lo traduce a `null`.
- `useFieldArray` para las imágenes: las filas son objetos `{ url }` y la key es `field.id`, no
  el índice, que se reusa al quitar una del medio.
- Una fila de imagen agregada y no llenada **no se manda** como `""`: el backend la rechaza con
  "las URLs de imagen no pueden estar vacías", así que Zod lo frena antes con un mensaje que sí
  dice qué hacer.

## Convenciones de git

Commits con [Conventional Commits](https://www.conventionalcommits.com/): `feat:`, `fix:`,
`chore:`, `docs:`.

El repositorio **es un repo git único** con los dos proyectos como subcarpetas (`turismo-backend`
y `turismo-frontend`); se commitea desde la raíz, con el `.gitignore` de la raíz.
