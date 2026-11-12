# Integración con OpenStreetMap (Nominatim)

Cómo Viajesazo obtiene **coordenadas reales** a partir de una dirección, usando **Nominatim**, el
geocoder de **OpenStreetMap (OSM)**. Cubre el cliente (`turismo-frontend`) y el backend
(`turismo-backend`), el porqué de cada decisión y el caso real que obligó a corregir el armado de
la query.

El *por qué* de las decisiones de Sprint 1 está en [`SPRINT-1.md`](./SPRINT-1.md) y en los
`AGENTS.md` de cada proyecto.

## 0. Resumen en una frase

> El cliente **sugiere** coordenadas para UX, pero el backend es la **fuente de verdad**: al guardar
> re-geocodifica los tres campos de texto y, si no encuentra la dirección, rechaza el alta con 400.

## 1. Qué es Nominatim y qué exige

- Es el buscador/geocoder de OpenStreetMap. **No requiere API key** (por eso se eligió).
- **Política de uso** (https://operations.osmfoundation.org/policies/nominatim/): como máximo
  **~1 request por segundo** y un **`User-Agent` identificable** (sin él responde 403).
- No se hardcodean claves. El backend sólo configura `base-url` y `user-agent` en
  `application.properties`.

## 2. Topología y actores

Hay **dos caminos** hacia Nominatim, con roles distintos:

```
                 (solo UX / sugerencia)                     (autoridad al guardar)
  Usuario taps                     Backend
 ┌──────────────┐   fetch     ┌───────────────┐   POST/PUT   ┌──────────────────┐
 │  Selector de │────────────▶│ proxy Vite    │              │  EventoController│
 │  ubicación   │  /nominatim │  /nominatim   │              │        │         │
 └──────────────┘             └───────┬───────┘              │        ▼         │
        ▲                             │                      │  EventoService   │
        │  preview lat/lng            ▼                      │        │         │
        │                    ┌──────────────────┐            │        ▼         │
   ┌──────────────┐          │   NOMINATIM       │◀───────────│ GeocodingService │
   │ Mapa (Leaflet)│          │  (OpenStreetMap)  │  /search   │  (RestClient)    │
   │ pin draggable │          └──────────────────┘            └──────────────────┘
   └──────────────┘                    ▲
        ▲                              │ /reverse
        └──────────────────────────────┘
```

- **Camino 1 — cliente → proxy Vite → Nominatim.** Alimenta el buscador y el reverse del pin. Es
  **descartable**: si falla, el formulario sigue funcionando.
- **Camino 2 — cliente → backend `/api/eventos` → `GeocodingService` → Nominatim.** Es el que
  decide si el evento se guarda o no. El cliente **nunca** manda coordenadas: manda texto.

## 3. Forward geocoding (búsqueda de lugar)

Cliente: `turismo-frontend/src/lib/geocoding.ts` → `buscarLugar(query, signal?)`.

- `GET /nominatim/search` con parámetros:
  `q`, `format=jsonv2`, `addressdetails=1`, `limit=5`, `countrycodes=ar`, `accept-language=es`,
  `viewbox=-65.8,-29.5,-61.8,-35.1` (Córdoba) y `bounded=1`.
- **`bounded=1` + viewbox de Córdoba:** Nominatim no devuelve lugares fuera de la provincia, que es
  el dominio de la tesis.
- Filtra resultados con `lat`/`lon` no finitos.
- **Tolerante:** un error de red o una respuesta no-2xx devuelven `[]` (la red no debe romper el
  formulario).

De cada resultado se extraen tres cosas (no se usa el `display_name` crudo, ver §5):

| Helper | Prioridad |
| --- | --- |
| `nombreDelLugar` | `name` → `amenity` → `tourism` → `road` → primer segmento del `display_name` |
| `localidadDe` | `city` → `town` → `village` → `hamlet` → `municipality` → `county` |
| `direccionDe` | `road` → `suburb` → `neighbourhood` → `city_district` → fallback |

## 4. Reverse geocoding y pin arrastrable

- El preview monta un mapa **Leaflet** (no `react-leaflet`: no soporta React 19) con un marcador
  `draggable`. Al soltar el pin (`dragend`) se dispara `onCoordsChange`.
- `geocodificarInverso(lat, lng, signal?)` llama `GET /nominatim/reverse` con
  `lat`, `lon`, `format=jsonv2`, `addressdetails=1`, `accept-language=es`.
- **Debounce:** el selector usa `reverseDelayMs` (default **1000 ms**) porque la política pide
  **≤1 req/s**. Si el usuario suelta el pin varias veces seguidas, sólo cuenta la última. Los tests
  lo bajan a `0`.
- El helper de dirección del reverse es el mismo `direccionDe`, con fallback
  `localidad || display_name.split(',')[0]`.

## 5. Por qué **calle sin número** y **nunca el `display_name`**

Esta es la lección central del caso real (§7).

- `direccionDe` toma `road` y **descarta el `house_number`**. Medido contra Nominatim: una query
  free-form de un **POI** que incluye el número de la calle (p. ej. `"... Cleto Peña 82 ..."`)
  devuelve **`[]`**. La altura exacta rompe la búsqueda de un punto de interés.
- **Nunca** se guarda el `display_name` completo (p. ej. `"Villa Carlos Paz, Municipio de Villa
  Carlos Paz, Pedanía San Roque, Departamento Punilla, Córdoba, X5166, Argentina"`). El backend
  **vuelve a concatenar** los tres campos de texto; meter esa cadena entera en `direccion` produce
  una query imposible.

## 6. Geocodificación autoritativa del backend

### 6.1 Configuración (`GeocodingConfig` y `application.properties`)

- `turismo-backend/.../config/GeocodingConfig.java` construye un bean `RestClient`
  (`nominatimRestClient`) a partir del `RestClient.Builder` autoconfigurado, con `base-url` y un
  header `User-Agent` por default (**obligatorio**, sin él Nominatim responde 403).
- Propiedades:
  ```
  geocoding.nominatim.base-url=https://nominatim.openstreetmap.org
  geocoding.nominatim.user-agent=Viajesazo/1.0 (tesis academica; contacto info@viajesazo.com)
  ```
- En Spring Boot 4, `RestClient` **no** viene en `spring-boot-starter-webmvc`: se agregó el starter
  `spring-boot-starter-restclient`.

### 6.2 `GeocodingService.geocode(lugarRecinto, localidad, direccion)`

- `GET /search` con `q=<query>`, `format=json`, `limit=1`, `countrycodes=ar`.
- Devuelve `Optional<Coordenadas>` (`latitud`/`longitud` como `BigDecimal`).
- **Tolerante a fallos:** una respuesta vacía, un error de red o un `NumberFormatException`
  devuelven `Optional.empty()`. Decidir si eso es error de negocio es de quien lo invoca, no del
  servicio (la red no debe tirar un 500).

### 6.3 Armado de la query (`buildQuery`) — dedup

El orden es de lo **más específico a lo más general**: `lugarRecinto`, `direccion`, `localidad`,
`"Córdoba"`, `"Argentina"`. Reglas:

1. Se descartan los campos vacíos o nulos.
2. Se descarta un campo si **contiene** a uno ya incluido o **está contenido** en él, sin distinguir
   mayúsculas (`Locale.ROOT`). Es un dedup **bidireccional**: así la misma localidad repetida en los
   tres campos colapsa a una mención, y el `display_name` entero que llegue en `direccion` se
   descarta frente a la localidad.
3. Se unen con `", "`.

Ejemplos (de `GeocodingServiceTest`):

| Entrada (`lugarRecinto`, `localidad`, `direccion`) | Query resultante |
| --- | --- |
| `("Villa Carlos Paz", "Villa Carlos Paz", "Villa Carlos Paz")` | `Villa Carlos Paz, Córdoba, Argentina` |
| `("Villa Carlos Paz", "Villa Carlos Paz", "<display_name completo>")` | `Villa Carlos Paz, Córdoba, Argentina` |
| `("Anfiteatro José Hernández", "Jesús María", "Cleto Peña")` | `Anfiteatro José Hernández, Cleto Peña, Jesús María, Córdoba, Argentina` |
| `("", null, "Centro")` | `Centro, Córdoba, Argentina` |
| `("Teatro Real", "Córdoba", "San Jerónimo 66")` | `Teatro Real, San Jerónimo 66, Córdoba, Argentina` |

### 6.4 Uso en `EventoService.applyUbicacion`

Corre en `create` y `update`:

```
coordenadas = geocodingService.geocode(lugarRecinto, localidad, direccion)
    .orElseThrow(() -> new BusinessRuleException(
        "no se encontró la ubicación del evento: revisá el lugar, la ciudad y la dirección"));
evento.setLatitud(coordenadas.latitud());
evento.setLongitud(coordenadas.longitud());
```

- **Si no geocodifica → 400 y el evento no se guarda.** Decisión explícita: un evento sin ubicación
  no sirve para el mapa.
- En `update`, la transacción revienta **antes** de tocar la entidad, así que las coordenadas
  viejas quedan intactas.
- El `EventoRequest` exige `lugarRecinto`, `localidad` y `direccion` (`@NotBlank`): son la entrada
  del geocoder.

## 7. El caso real: el 400 al registrar un evento

**Síntoma.** El alta devolvía **400** (`"no se encontró la ubicación del evento..."`) con una
dirección que existía.

**Causa.** El cliente mandaba en `direccion` el `display_name` **completo** de Nominatim y además
repetía la localidad en `lugarRecinto`, `localidad` y `direccion`. El backend concatenaba todo y una
query con el término repetido (o con el `display_name` entero dentro de un campo) hace que el
buscador free-form devuelva **`[]`**.

Request que fallaba:

```
lugarRecinto = "Villa Carlos Paz"
localidad    = "Villa Carlos Paz"
direccion    = "Villa Carlos Paz, Municipio de Villa Carlos Paz, Pedanía San Roque,
                Departamento Punilla, Córdoba, X5166, Argentina"
```

**Evidencia** (consultas medidas contra Nominatim con `User-Agent` identificable):

| Query | Resultado |
| --- | --- |
| los tres campos tal cual llegaban | `[]` (vacío) |
| `Villa Carlos Paz, Córdoba, Argentina` | OK |
| `Villa Carlos Paz, Villa Carlos Paz, Córdoba, Argentina` | resuelve **mal** (una farmacia) |
| `Anfiteatro José Hernández, Cleto Peña, Jesús María, Córdoba, Argentina` | OK |
| `... Cleto Peña 82 ...` (con número) | `[]` |

**Solución** (frontend **y** backend, **sin** cadena de fallback): se decidió arreglar el origen del
problema en lugar de agregar reintentos con queries alternativas.

- **Backend:** `buildQuery` con el dedup bidireccional (§6.3). El caso del usuario colapsa a
  `Villa Carlos Paz, Córdoba, Argentina`.
- **Frontend:** `direccionDe` toma la calle y nunca el `display_name`, y descarta el número (§5).

## 8. Configuración y despliegue

| Dónde | Qué | Valor |
| --- | --- | --- |
| `vite.config.ts` | proxy de desarrollo `/nominatim` | → `https://nominatim.openstreetmap.org` (quita el prefijo) |
| `turismo-backend/application.properties` | `geocoding.nominatim.base-url` | `https://nominatim.openstreetmap.org` |
| `turismo-backend/application.properties` | `geocoding.nominatim.user-agent` | `Viajesazo/1.0 (...)` |

- El proxy de Vite hace la request **same-origin** en desarrollo y evita CORS, igual que el proxy de
  `/api`.
- **En producción** hace falta un proxy inverso delante (del lado del servidor) que mande un
  `User-Agent` identificable, como exige la política de Nominatim. El frontend no puede ponerlo
  desde el navegador.

## 9. Errores y tolerancia

| Situación | Cliente | Backend |
| --- | --- | --- |
| Red caída / timeout | `[]` / `null` (el form sigue) | `Optional.empty()` |
| Respuesta no-2xx | `[]` / `null` | `Optional.empty()` |
| Sin resultados | avisa "No se encontraron resultados…" | lanza `BusinessRuleException` → **400** |

La regla de oro: **un fallo de la red nunca debe convertirse en un 500**. El cliente degrada sin
romper el formulario; el backend traduce "no encontrado" a un 400 con mensaje en español.

## 10. Tests y mocks

| Nivel | Archivo | Qué verifica |
| --- | --- | --- |
| Backend | `GeocodingServiceTest` (5) | armado y dedup de la query, sin red |
| Frontend | `ubicacion-selector.test.tsx` (8) | buscar/listar, completar los 3 campos, reverse al arrastrar, fallo de Nominatim |
| Frontend | `evento-mapa.test.tsx` (4) | render del mapa del detalle (Leaflet mockeado) |

- El backend **no** ejercita `geocode` contra la red: los tests de servicio mockean `GeocodingService`
  y el `GeocodingServiceTest` prueba sólo la lógica de `buildQuery`.
- El frontend mockea Nominatim con **MSW** vía los handlers `GET /nominatim/search` y
  `GET /nominatim/reverse` (rutas **relativas**, nunca el dominio absoluto), con
  `onUnhandledRequest: 'error'`: una request sin handler rompe el test en vez de salir a la red.
- Leaflet no se banca **jsdom** y se mockea en los tests.

## 11. Diagramas de secuencia (texto)

**Alta de evento (US1):**

```
Usuario                          Frontend                        Backend                 Nominatim
  │  escribe "Villa Carlos Paz"     │                               │                       │
  │────────────────────────────────▶│ buscarLugar()                 │                       │
  │                                 │── GET /nominatim/search ──────┼──────────────────────▶│
  │                                 │◀─ resultados ─────────────────┼───────────────────────│
  │  elige un resultado             │                               │                       │
  │────────────────────────────────▶│ completa los 3 campos         │                       │
  │  submit                         │ toEventoRequest()             │                       │
  │────────────────────────────────▶│── POST /api/eventos ─────────▶│ applyUbicacion()      │
  │                                 │                               │ geocode(buildQuery) ─▶│
  │                                 │                               │◀─ lat/lng ────────────│
  │                                 │                               │ guarda (201)          │
  │◀────────────── 201 + evento ────┼───────────────────────────────│                       │
```

**Edición moviendo el pin:**

```
Usuario           Frontend                     Backend
  │  arrastra pin   │                            │
  │────────────────▶│ dragend → debounce 1000ms   │
  │                 │── GET /nominatim/reverse ─▶ Nominatim
  │                 │◀─ direcciónDe(address) ─────┘
  │                 │ actualiza direccion/localidad/lugarRecinto
  │  save           │── PUT /api/eventos/{id} ──▶ re-geocodifica y guarda (o 400)
```

## 12. Referencias

- Política de uso de Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- Código: `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/GeocodingService.java`,
  `.../config/GeocodingConfig.java`, `.../service/EventoService.java`;
  `turismo-frontend/src/lib/geocoding.ts`,
  `.../components/ubicacion-selector.tsx`, `.../components/ubicacion-preview-mapa.tsx`,
  `.../vite.config.ts`.
- [`SPRINT-1.md`](./SPRINT-1.md) — contexto del Sprint 1 y decisiones del formulario de eventos.
