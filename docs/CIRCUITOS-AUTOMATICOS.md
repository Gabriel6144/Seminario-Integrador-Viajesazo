# Generación automática de circuitos

## Alcance

La API genera circuitos para un viaje registrado mediante `POST
/api/viajes/{id}/circuito`. La respuesta contiene tres alternativas:

- `CERCANIA`: prioriza minimizar traslados.
- `INTERESES`: prioriza las categorías elegidas.
- `DESCUBRIMIENTO`: prioriza variedad y propuestas con menos días disponibles.

El motor es determinista y está separado de Spring y de JPA. Las distancias se estiman con
Haversine y una velocidad media fija de 30 km/h; la respuesta informa
`distanciasEstimadas=true`. El proveedor se puede reemplazar sin modificar el algoritmo.

## Reglas confirmadas

- Las fechas del viaje son inclusivas. Si el viaje ya comenzó, se planifica desde hoy.
- Se permiten viajes `PLANIFICADO`, `EN_CURSO` y `BORRADOR` completo. Los estados terminales no
  se pueden generar.
- Se informan todos los datos faltantes en un único mensaje.
- Las propuestas canceladas o finalizadas, fuera del radio o fuera de la ventana temporal se
  excluyen.
- Una actividad debe tener al menos una franja horaria válida. Un evento sin horario ocupa la
  ventana estándar de 09:00 a 18:00.
- Las propuestas sin categoría se admiten solo como relleno de baja prioridad.
- El ritmo limita a 2, 3 o 4 propuestas por día (`TRANQUILO`, `EQUILIBRADO`, `INTENSIVO`).
- Cada propuesta aparece como máximo una vez por alternativa, sin solapamientos y respetando el
  tiempo estimado de traslado.
- Si no hay propuestas compatibles se devuelve una alternativa vacía con advertencia, no un error.
- Las tres alternativas se guardan como instantánea de generación para permitir que el turista
  compare y seleccione una. Solo la alternativa seleccionada se expone dentro de la consulta
  normal del viaje (`GET /api/viajes/{id}`), en el campo `circuito`.
- La selección se realiza con `POST /api/viajes/{id}/circuito/seleccion`, por ejemplo:

```json
{ "estrategia": "INTERESES" }
```

- Una vez generado no se permite regenerar. Si una propuesta incluida se da de baja, el ítem se
  conserva y se marca `disponible=false`; no se reubican los demás ítems. Si se edita el viaje,
  la instantánea se conserva sin recalcular.

## Consulta

`GET /api/viajes/{id}/circuito` devuelve las tres alternativas guardadas, sus métricas
comparables (`distanciaTotalKm`, `afinidadIntereses`, `categoriasCubiertas`) y los ítems con
fecha, orden, horario y traslado desde el ítem anterior. Cada ítem incluye además el snapshot
visual y de ubicación: `imagenes`, `ciudad`, `localidad`, `direccion`, `lugarRecinto`, `latitud`,
`longitud`, `tipoAcceso`, `montoEstimado`, `descripcionArancel`, `sitioOficial` y
`duracionMinutos`. `GET /api/viajes/{id}` devuelve además la alternativa seleccionada, sin
regenerarla.

`GET /api/viajes?usuario=` es el listado que alimenta “Mis viajes”: devuelve tanto borradores
como viajes confirmados; el frontend usa `estado !== 'BORRADOR'` para distinguir un circuito ya
confirmado.

## Agenda y ventana horaria

El motor planifica desde `max(hoy, fechaInicio)` hasta `fechaFin`, con una ventana diaria de
**06:00 a 23:59**. Una actividad se agenda en el horario exacto de su franja de disponibilidad; el
traslado desde la parada anterior tiene que caber antes del inicio. Un evento sin horario ocupa
`09:00–18:00`. El ritmo fija el máximo de paradas por día: 2 (`TRANQUILO`), 3 (`EQUILIBRADO`) o 4
(`INTENSIVO`).

## Persistencia

- El circuito se guarda como snapshot completo: nombre, descripción y categoría de cada propuesta,
  además de fecha, orden, horario, traslado y disponibilidad. También conserva las imágenes, la
  ubicación y sus coordenadas, el tipo de acceso, el arancel, el sitio oficial y la duración, para
  que el detalle y los mapas no dependan de una segunda consulta a la propuesta.
- `CircuitoAlternativa.items` se ordena con `@OrderBy("orden ASC")`. **No usar `@OrderColumn` sobre
  `orden`**: duplica la columna, al releer la lista llegan elementos `null` y la respuesta explota
  con NPE. Lo cubre `CircuitoRepositoryTest`.
- El seed carga ubicaciones de propuestas que comparten ciudad. Las subconsultas de `data.sql` para
  la zona del viaje deben filtrar además `direccion IS NULL`; si no, H2 devuelve más de una fila y
  el seed falla.

## En el frontend

El planificador (`/planificador`) persiste el viaje y después llama a la generación. El paso 9 es
solo animación: el paso 10 aparece cuando terminaron los mensajes y llegó la respuesta. Si la
generación falla, el viaje ya quedó guardado y el reintento reutiliza ese `id` en vez de crear otro.
La pantalla final permite comparar las tres estrategias, ver las paradas por día, seleccionar una
sola alternativa y guardar el viaje en “Mis viajes”.

El adaptador `circuito-view-model.ts` transforma la respuesta de la API en el modelo de la UI:
agrupa los ítems por `fecha`, arma los días y `stopsByDay`, calcula la duración de cada día y
resuelve la imagen o el placeholder. El detalle, el mapa general y el mapa de cada parada consumen
ese modelo; ya no hay circuitos, paradas ni alternativas hardcodeadas en `constants.ts`. Las
acciones de sustituir y eliminar paradas quedan deshabilitadas con “Próximamente” hasta VZ-27.

“Mis viajes” (`/borradores`) usa `GET /api/viajes?usuario=` y muestra juntos borradores y viajes
confirmados. Los confirmados no ofrecen descartar ni “continuar planificando”; las tarjetas de
borrador conservan ese flujo.
