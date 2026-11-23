# CLAUDE.md — Viajesazo

Este archivo lo lee Claude Code al abrir la carpeta. Resume el proyecto, cómo trabajar con quien
lo mantiene y las decisiones que ya se tomaron, para no tener que volver a charlarlas.

**Antes de tocar código, leé el `AGENTS.md` de la parte que vas a cambiar:**

- `turismo-backend/AGENTS.md`: comandos, convenciones, H2, modelo, API por sprint, errores, tests.
- `turismo-frontend/AGENTS.md`: comandos, trampas de la API, planificador, mapas, tests, shadcn.

Si algo de acá contradice un `AGENTS.md`, manda lo más nuevo: este archivo se escribió el
20/11/2026, después de la última ronda de cambios del circuito.

## Quién trabaja en esto

- **Matías.** Es la tesis del Seminario Integrador. **No es programador.**
- Hablale en **español informal, rioplatense (con voseo)**.
- Dale **instrucciones exactas para copiar y pegar en PowerShell** (Windows), en orden, y explicá
  **qué hace cada paso y por qué**. No des por sabido nada de Git, Maven ni npm.
- **No rompas funcionalidades que ya existen.** Si un cambio toca algo que ya andaba, decilo antes.
- **Avisá siempre cuándo hay que reiniciar el backend** (ver abajo); es la causa más común de
  "me sale un error raro".
- Edita desde Cursor y desde Claude. Cursor compila los `.java`, pero **no reinicia la app**.

## Qué es y cómo está armado

App de turismo de la provincia de Córdoba: catálogo de propuestas (eventos y actividades) de
publicadores, agenda, y un **planificador de viajes que genera circuitos día por día**.

Es un **único repo git** con dos proyectos en subcarpetas (se commitea desde la raíz):

| Carpeta | Stack |
| --- | --- |
| `turismo-backend` | Spring Boot 4.1.1, Java 17 (JDK local 21), H2 en memoria, MapStruct, Lombok, JWT |
| `turismo-frontend` | React 19 + TypeScript + Vite + Tailwind 4 + shadcn (radix-nova) + TanStack Query + React Router + Leaflet + MapLibre; tests con Vitest + Testing Library + MSW |
| `docs` | Documentación (seguridad, etc.) |

## Cómo se corre (Windows / PowerShell)

Dos terminales, una para cada proyecto.

```powershell
# Terminal 1: la API en http://localhost:8080
cd "C:\Users\Thiago Alejo Decalli\Documents\Seminario-Integrador-Viajesazo\turismo-backend"
.\mvnw.cmd spring-boot:run
# Lista cuando aparece "Started TurismoBackendApplication"

# Terminal 2: el frontend en http://localhost:5173
cd "C:\Users\Thiago Alejo Decalli\Documents\Seminario-Integrador-Viajesazo\turismo-frontend"
npm run dev
```

| Tarea | Backend (`turismo-backend`) | Frontend (`turismo-frontend`) |
| --- | --- | --- |
| Tests | `.\mvnw.cmd clean test` (siempre con `clean`, ver su AGENTS.md) | `npm test` |
| Tipos | — | `npm run typecheck` |
| Lint | — | `npm run lint` (oxlint) |
| Build | `.\mvnw.cmd clean package` | `npm run build` (corre `tsc -b` antes) |

- **Después de cualquier cambio en Java hay que reiniciar el backend**: `Ctrl + C` en su
  terminal (o Stop en el IDE) y de nuevo `.\mvnw.cmd spring-boot:run`. Si no, la app sigue con el
  código viejo y el frontend recibe respuestas con otra forma.
- **H2 se borra en cada reinicio** (`create-drop`) y `data.sql` vuelve a sembrar los datos de
  prueba. Viajes y circuitos creados a mano se pierden al reiniciar: es normal.
- Usar siempre el wrapper (`.\mvnw.cmd`), nunca un `mvn` global.
- Puede haber una carpeta `turismo-backend/target/libs` con los jars copiados (se usó para
  compilar afuera). No molesta y desaparece con `.\mvnw.cmd clean`.

## El circuito: cómo recomienda y qué se decidió

Toda la lógica vive en el backend: `circuit/CircuitGenerator` (motor puro, sin Spring) y
`service/CircuitoService` (arma candidatos, persiste, edita). Endpoints en
`controller/CircuitoController`, todos bajo `/api/viajes/{viajeId}/circuito`.

### Qué entra en un circuito

Una propuesta solo es candidata si cumple **todo**:

1. Está activa y tiene coordenadas.
2. Su categoría está en los **intereses** que el turista eligió en los pasos del planificador.
3. Está dentro del **radio** (`rangoInteresKm`) alrededor de la zona del viaje.
4. Tiene horarios dentro de las fechas del viaje (si el viaje ya empezó, desde hoy).

Después se arma cada día:

- **Ritmo** (tope de paradas por día): Tranquilo 2, Equilibrado 4, Intenso 5. Manual respeta las
  cuotas exactas de eventos y actividades que puso el turista (o menos, si no alcanza).
- Ventana del día **06:00 a 23:59**, sin solapes, con traslados por **Haversine a 30 km/h**
  (no OSRM). Un evento sin horario ocupa 09:00 a 18:00.
- No repite propuestas. `compactDay` rellena huecos con lo que sobró.

### Las 3 alternativas y los Me gusta

Se generan tres alternativas: `CERCANIA`, `INTERESES` y `DESCUBRIMIENTO`. Los **Me gusta** que el
turista da en Propuestas **pesan de verdad** en `choose()`:

- `CERCANIA` (con parada previa): tramos de 500 m → Me gusta → popularidad → distancia exacta.
- `DESCUBRIMIENTO`: categoría todavía no cubierta → Me gusta → disponibilidad → popularidad → nombre.
- `INTERESES`: afinidad con los intereses → Me gusta → popularidad → nombre.

"Popularidad" es la cantidad total de Me gusta que tiene la propuesta.

### Editar paradas

Se pueden **sustituir** y **eliminar** paradas en dos momentos:

- **Antes de confirmar** (paso 10 del planificador), sobre cualquiera de las 3 alternativas:
  `GET/PUT/DELETE /alternativas/{estrategia}/items/{itemId}...`. Solo mientras
  `estrategiaSeleccionada == null`; si ya hay una elegida responde **400** ("el circuito ya tiene
  una alternativa elegida…").
- **Después de confirmar** (página del circuito): `GET/PUT/DELETE /seleccionado/items/{itemId}...`.
- Las dos variantes de `DELETE` piden `?confirmar=true` (sin eso, **409**).
- **Completar días incompletos** también va en los dos momentos:
  - Confirmado: `GET .../seleccionado/dias/{fecha}/sugerencias`, `POST .../seleccionado/dias/{fecha}/items`
    y `PUT .../seleccionado/dias/{fecha}/aviso` ("Dejarlo así", queda guardado).
  - Antes de confirmar: `GET .../alternativas/{estrategia}/dias` (estado de cada día, contado en vivo
    sobre las paradas de la alternativa), `GET .../alternativas/{estrategia}/dias/{fecha}/sugerencias`
    y `POST .../alternativas/{estrategia}/dias/{fecha}/items`. Acá "Dejarlo así" solo oculta el aviso
    en pantalla (no se guarda).
  - Al confirmar, lo que el turista sumó antes cuenta como "agregado por vos" (`agregadasPorUsuario`)
    y no como asignado por la generación.

### Sustituir: el "hueco del día"

`GET .../items/{itemId}/alternativas` devuelve `OpcionesSustitucionResponse`:
`fecha`, `huecoInicio`, `huecoFin`, `paradaAnterior`, `paradaSiguiente`, `opciones[]`,
`noEntran[]` y `mensaje`.

- **Hueco** = desde que termina la parada anterior (o 06:00) hasta que empieza la siguiente
  (o 23:59). Una opción entra si llega a tiempo desde la anterior contando el traslado, llega a
  tiempo a la siguiente y no se pisa con otra parada. Horarios que cruzan la medianoche suman 24 h.
- Entran propuestas activas dentro del radio **aunque no sean de sus intereses**; esas vienen con
  `enIntereses=false` y la UI las marca "Fuera de tus preferencias".
- **Orden:** Me gusta → de sus intereses → tramos de 500 m de distancia → popularidad →
  distancia → nombre. La distancia se mide desde la parada anterior (si no hay, la siguiente; si
  no, la reemplazada).
- `noEntran`: hasta 6 propuestas que le gustaron o son de sus intereses pero no caben, con el
  motivo ("Queda a X km de tu zona y tu radio es de Y km", "No se realiza ese día", "No abre ese
  día", "Su horario (…) no entra entre X y Y contando los traslados").
- Sin opciones: `opciones: []` y el `mensaje` "No hay propuestas que entren en ese hueco del día
  sin romper el itinerario".
- El `PUT` vuelve a validar todo antes de cambiar nada (**422** si ya no entra) y renumera el día.

### Inscripciones del publicador

No hay tabla de inscripciones: se **cuentan en vivo** desde las paradas de la alternativa
confirmada (`CircuitoItemRepository`, `COUNT(DISTINCT usuario)` por propuesta, solo propuestas con
publicador). Por eso:

- Sustituir una parada **mueve** la inscripción a la propuesta nueva y eliminarla la **saca**, sin
  código extra.
- Los viajes **CANCELADO no cuentan** (las 3 consultas filtran `v.estado <> CANCELADO`).
- El publicador lo ve en su dashboard y en `/api/publicador/inscriptos`.
- Lo cubre `CircuitoItemRepositoryTest`.

## Frontend del circuito

- **Planificador, paso 10** (`components/planificador/paso-10-circuito.tsx`): muestra las 3
  alternativas; se puede abrir una y recorrerla día por día. Sustituir/Eliminar solo aparecen si
  todavía no se eligió ninguna.
- **Circuito confirmado** (`pages/circuito-page.tsx`, ruta `/viajes/:id/circuito`).
- Las dos usan `CircuitoDiaSplitView`: lista con scroll-snap + mapa 2D (Leaflet) / 3D (MapLibre),
  ruta a pie por OSRM con línea recta de respaldo, "Recorrer el día" con el muñequito (44×49 px,
  movimiento fluido) y links a Google Maps.
- **El estado vive en la URL** para que F5 no te saque de donde estabas: `?viaje=` en el
  planificador y `?alternativa=` + `?dia=` en el paso 10 y en la página del circuito.
- **Sustituir** = `components/planificador/sustituir-parada-panel.tsx` (panel `Dialog`): línea de
  tiempo del hueco, filtros (todas / me gusta / intereses / otras; evento / actividad), orden
  (recomendadas / cerca / populares), tarjetas con letra A, B, C… y sus motivos, sección
  plegable "No entran ese día", pie Antes → Después con la diferencia de km. Mapa en
  `sustitucion-mapa.tsx` (recorrido actual punteado, vista previa en azul, pines con letra).
- **Completar el día** = `CompletarDiaDialog` (`completar-dia-dialog.tsx`), el mismo diálogo en el
  paso 10 y en el circuito confirmado; el aviso es `AvisoDiaIncompleto` y se vuelve interactivo
  cuando la vista recibe `onVerSugerencias`.
- **Eliminar** = `EliminarParadaDialog` en `parada-dialogs.tsx`: dice cómo queda el día ("Vas a ir
  de X directo a Y") y, si el circuito está confirmado, que deja de figurar como inscripto.
- El panel de sustituir **valida la respuesta**: si llega con el formato viejo (sin `opciones`
  como lista) no se rompe y muestra un aviso amarillo de "reiniciá el backend".
- Diseño de referencia (mesa de diseño con Sustituir): https://claude.ai/artifact/EvKCC1wg5Ayvgj9UxaSQLd

## Trampas conocidas

- **Leaflet:** fijar una vista (`setView`/`fitBounds`) antes de agregar capas, y destruir el mapa
  dentro de `try/catch` (si el contenedor ya no está, tira error).
- **Textos de publicadores en el mapa:** los tooltips se arman con `textContent`, nunca con HTML,
  porque los nombres los escribe cualquier publicador.
- **Los tests del frontend mockean los mapas** (`circuito-ruta-mapa`, `sustitucion-mapa`):
  jsdom no tiene canvas ni WebGL. MSW corre con `onUnhandledRequest: 'error'`.
- **En los tests del backend no corre `data.sql`**: cada test arma sus datos.
- `package-lock.json` incluye `@rolldown/binding-win32-x64-msvc` (binario de Windows). No sacarlo.
- Un cambio de forma en una respuesta de la API va en los dos lados a la vez: el DTO de Java, los
  tipos de `src/types/api.ts`, los fixtures/handlers de MSW y los tests.

## Implementado (22/11/2026)

- **Filtros de `/propuestas` en el servidor**: `usePropuestas` manda `q`, `ciudad`, `estado`,
  `tipoPropuesta`, `categoria`, fechas e `incluirCanceladas`; el paginado y los contadores son
  reales. Nuevos endpoints `GET /api/propuestas/resumen` y `GET /api/propuestas/zonas`. Las
  fechas ya aplican a eventos y actividades y `CANCELADO` se oculta salvo que el publicador lo
  pida.
- **Sugerencias**: respetan `fechaInicio/fechaFin` de la actividad, la ventana 06:00–23:59 y el
  cruce de medianoche; no se devuelven en días pasados ni con “Dejarlo así”. Se ofrecen también
  las de tus intereses (`DE_TUS_INTERESES`) y `noEntran[]` explica radio/día/horario.
- **Cancelar viaje**: `useCancelarViaje` usa el `DELETE /api/viajes/{id}` (baja lógica) con
  confirmación desde Mis Viajes y desde la página del circuito. Solo para `PLANIFICADO`.
- **Exportar PDF estilo Stitch**: `pdfmake` en el front (UMD cargado sólo al exportar). El resumen
  va en una **sección A4 horizontal full-bleed** (842×595, márgenes 0), con página blanca, hero de
  404×595 y columna derecha del mismo blanco para que no quede marco ni franja rasgada. Hero
  compuesto (foto del Stitch + degradado + textos), timeline con todas las paradas y footer del
  Stitch. Las **páginas por día** son A4 vertical con micro-header, título de ruta, badge coral,
  mapa grande (MapLibre capturado + ruta OSRM del día, pines numerados, etiquetas, norte, leyenda y
  escala) y timeline con píldoras de hora, círculos outline y línea ondulada. Debajo del mapa va una
  **galería editorial** full width anclada al pie de la página con hasta 3 tarjetas (foto inclinada
  **por encima** de una cápsula crema con número, hora, título y descripción), más una pastilla
  “+N paradas más”. El mapa usa 302×410 y la timeline tiene más aire. Fuentes
  Caveat/Montserrat/Inter; si el mapa falla cae al SVG esquemático (`circuito-svg.ts`). La
  definición pura está en `src/lib/circuito-pdf.ts` + `src/lib/circuito-pdf-day.ts`; el hero y los
  badges se componen con canvas en `src/lib/circuito-pdf-hero.ts`, el mapa del día en
  `src/lib/circuito-pdf-day-map.ts` y la galería en `src/lib/circuito-pdf-day-gallery.ts`. La ruta
  del día se busca primero en la caché de `rutaQueryKey`; si no está, se pide a OSRM y, si falla,
  **no se dibuja línea**. Las fotos se prueban en orden y, si el host no manda CORS, se piden al
  proxy `wsrv.nl` (`loadFirstPhotoDataUrl`). El fondo de página lo pinta la definición (blanco en
  el resumen, papel en los días).

## Estado y pendientes (al 20/11/2026)

- Backend: compila y pasan los tests de generador, servicio, controlador y repositorios.
- Frontend: **338 tests en 42 archivos, 334 en verde** en la corrida completa. Los 3 que fallan son
  de `evento-detail-page.test.tsx` y ya fallaban antes (no son del circuito); el de
  `planificador-page` de la URL es flaky bajo carga y pasa solo.
- Pendientes conocidos, todavía no pedidos:
  - El mínimo de paradas por ritmo no coincide: backend `dayMinimum` usa 2/4/5 y el frontend
    `RITMO_MIN_PARADAS` (en `circuito-dia-split-view.tsx` y `circuito-detalle-view.tsx`) usa
    1/3/5, y las etiquetas de los pasos dicen "1 a 2" y "3 a 4".
  - `circuito-page.tsx` muestra "Equilibrado" como ritmo por defecto si no llega uno.
  - Hay advertencias de lint viejas (las de shadcn y RHF se dejan a propósito).
