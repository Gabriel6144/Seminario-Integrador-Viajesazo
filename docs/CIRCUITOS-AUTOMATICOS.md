# Generación automática de circuitos

## Alcance

La API genera circuitos para un viaje registrado mediante `POST
/api/viajes/{id}/circuito`. La respuesta contiene tres alternativas:

- `CERCANIA`: prioriza minimizar traslados.
- `INTERESES`: prioriza las categorías elegidas.
- `DESCUBRIMIENTO`: prioriza variedad y propuestas con menos días disponibles.

El motor es determinista y está separado de Spring y de JPA. Las distancias se estiman con
Haversine y una velocidad media configurable dentro del proveedor; la respuesta informa
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
fecha, orden, horario y traslado desde el ítem anterior. `GET /api/viajes/{id}` devuelve además
la alternativa seleccionada, sin regenerarla.
