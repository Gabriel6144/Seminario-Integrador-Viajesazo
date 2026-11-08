# Pruebas manuales en Postman — Viajes y circuitos

> **Estado:** vigente para el Sprint 3.
> **Alcance:** viajes, borradores y circuitos. Todos los ejemplos están pensados para
> ejecutarse desde Postman, sin `curl`.
> **Requisito:** la aplicación levantada en `http://localhost:8080`.

## 1. Antes de empezar

1. Levantar el backend:

   ```powershell
   cd turismo-backend
   .\mvnw.cmd spring-boot:run
   ```

2. Esperar en el log:

   ```text
   Started TurismoBackendApplication
   ```

3. Recordar que la base es H2 en memoria con `ddl-auto=create-drop`. **Cada reinicio borra
   todo y vuelve a ejecutar el seed.** Si una prueba falla por datos viejos, reiniciar la app.

4. Los viajes del seed ya vienen en estado `PLANIFICADO` y con fechas futuras, así que se
   puede probar la generación de circuitos sin crear nada.

## 2. Configuración de Postman

### 2.1 Environment

Crear un environment llamado `Viajesazo local` con estas variables:

| Variable | Valor inicial |
|---|---|
| `baseUrl` | `http://localhost:8080` |
| `usuario` | `turista.demo@viajesazo.com` |
| `viajeId` | *(vacío)* |
| `borradorId` | *(vacío)* |

`viajeId` y `borradorId` se completan solos con los scripts de la sección 2.3.

### 2.2 Headers

En los requests que llevan body (`POST` y `PUT`), usar:

| Key | Value |
|---|---|
| `Content-Type` | `application/json` |

En Postman: **Body → raw → JSON** y pegar el JSON del ejemplo.

Los `GET`, `DELETE` y la generación/consulta de circuito **no llevan body**.

### 2.3 Guardar IDs automáticamente

En el request `POST /api/viajes`, pestaña **Tests**:

```js
pm.test("201 Created", () => pm.response.to.have.status(201));
pm.environment.set("viajeId", pm.response.json().id);
```

En el request `POST /api/viajes/borradores`, pestaña **Tests**:

```js
pm.test("201 Created", () => pm.response.to.have.status(201));
pm.environment.set("borradorId", pm.response.json().id);
```

### 2.4 Fechas futuras sin hardcodear

El backend rechaza fechas de inicio anteriores a hoy. Para no editar los JSON cada vez que
se corre la prueba, en el **Pre-request Script a nivel de colección** se pueden calcular:

```js
const hoy = new Date();

const sumarDias = (dias) => {
  const fecha = new Date(hoy);
  fecha.setDate(hoy.getDate() + dias);
  return fecha;
};

const formato = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
    fecha.getDate()
  ).padStart(2, "0")}`;

pm.environment.set("fechaInicio", formato(sumarDias(7)));
pm.environment.set("fechaFin", formato(sumarDias(13)));
pm.environment.set("fechaInicioBorrador", formato(sumarDias(14)));
pm.environment.set("fechaFinBorrador", formato(sumarDias(16)));
```

Si se prefiere hacerlo a mano, reemplazar `{{fechaInicio}}` y `{{fechaFin}}` por dos fechas
futuras concretas en formato `AAAA-MM-DD`.

## 3. Datos del seed

Todos los viajes del seed nacen en `PLANIFICADO`, con fechas relativas a hoy:

| ID | Viaje | Usuario | Zona de interés |
|---:|---|---|---|
| 1 | Escapada serrana por Villa General Belgrano | `turista.demo@viajesazo.com` | Villa General Belgrano |
| 2 | Cultura y naturaleza en Córdoba | `turista.demo@viajesazo.com` | Ciudad de Córdoba |
| 3 | Aventura en el Valle de Punilla | `turista.aventura@viajesazo.com` | Carlos Paz |
| 4 | Sabores y tradiciones de Córdoba | `turista.gastronomico@viajesazo.com` | Alta Gracia |
| 5 | Recorrido familiar por las sierras | `familia.demo@viajesazo.com` | La Cumbrecita |

Para una primera prueba rápida del circuito se puede usar directamente `{{baseUrl}}/api/viajes/1`.
Para una prueba con más propuestas candidatas, crear un viaje nuevo con la zona `Ciudad de
Córdoba` y un radio amplio, como se muestra en la sección 5.1.

## 4. Flujo recomendado

1. `POST /api/viajes` para crear un viaje (o usar el viaje 1 del seed).
2. `GET /api/viajes?usuario={{usuario}}` para confirmar que aparece.
3. `GET /api/viajes/{{viajeId}}` para ver el detalle y el campo `circuito` (todavía `null`).
4. `POST /api/viajes/{{viajeId}}/circuito` para generar las alternativas.
5. `GET /api/viajes/{{viajeId}}/circuito` para consultarlas.
6. `POST /api/viajes/{{viajeId}}/circuito/seleccion` para elegir una.
7. `GET /api/viajes/{{viajeId}}` para comprobar que el campo `circuito` ya trae la seleccionada.
8. Probar los errores: regenerar y volver a seleccionar deben responder `400`.

El flujo de borradores va por separado:

1. `POST /api/viajes/borradores`.
2. `GET /api/viajes/borradores?usuario={{usuario}}`.
3. `GET /api/viajes/borradores/{{borradorId}}`.
4. `PUT /api/viajes/borradores/{{borradorId}}`.
5. `POST /api/viajes/borradores/{{borradorId}}/completar`.
6. `DELETE /api/viajes/borradores/{{borradorId}}` (si se quiere descartar otro borrador).

## 5. Endpoints de viajes

### 5.1 `POST /api/viajes` — crear viaje

- **Método:** `POST`
- **URL:** `{{baseUrl}}/api/viajes`
- **Body:** raw JSON

```json
{
  "nombre": "Circuito de prueba en Córdoba",
  "ubicacion": {
    "ciudad": "Ciudad de Córdoba",
    "localidad": "Córdoba",
    "latitud": -31.42,
    "longitud": -64.18
  },
  "rangoInteresKm": 100,
  "fechaInicio": "{{fechaInicio}}",
  "fechaFin": "{{fechaFin}}",
  "ritmo": "EQUILIBRADO",
  "intereses": ["NATURALEZA", "CULTURA", "MUSICA", "GASTRONOMIA"],
  "usuario": "{{usuario}}"
}
```

- **Status esperado:** `201 Created`
- **Nota:** el viaje nace en `PLANIFICADO` y con `circuito: null`. Guardar el `id` en `viajeId`.

### 5.2 `GET /api/viajes` — listar viajes del turista

- **Método:** `GET`
- **URL:** `{{baseUrl}}/api/viajes?usuario={{usuario}}&page=0&size=20`
- **Params:**

  | Key | Value |
  |---|---|
  | `usuario` | `{{usuario}}` |
  | `page` | `0` |
  | `size` | `20` |

- **Body:** no lleva.
- **Status esperado:** `200 OK`
- **Nota:** solo devuelve viajes en `BORRADOR`, `PLANIFICADO` o `EN_CURSO`. Sin `usuario`
  responde `400`.

### 5.3 `GET /api/viajes/estado` — listar por estado

- **Método:** `GET`
- **URL:** `{{baseUrl}}/api/viajes/estado?usuario={{usuario}}&estado=PLANIFICADO`
- **Params:**

  | Key | Value |
  |---|---|
  | `usuario` | `{{usuario}}` |
  | `estado` | `PLANIFICADO` |
  | `page` | `0` |
  | `size` | `20` |

- **Body:** no lleva.
- **Status esperado:** `200 OK`
- **Nota:** el parámetro `estado` es repetible. En Postman, agregar la misma key varias veces:

  | Key | Value |
  |---|---|
  | `usuario` | `{{usuario}}` |
  | `estado` | `BORRADOR` |
  | `estado` | `PLANIFICADO` |
  | `estado` | `EN_CURSO` |

  Solo se aceptan esos tres estados. `CANCELADO`, `FINALIZADO` o un valor inexistente
  responden `400`.

### 5.4 `GET /api/viajes/{id}` — detalle del viaje

- **Método:** `GET`
- **URL:** `{{baseUrl}}/api/viajes/{{viajeId}}`
- **Body:** no lleva.
- **Status esperado:** `200 OK`
- **Nota:** incluye el campo `circuito`. Antes de seleccionar una alternativa viene en `null`.
  Un viaje `BORRADOR` o `CANCELADO` responde `404`; para borradores usar la sección 6.

### 5.5 `PUT /api/viajes/{id}` — modificar viaje

- **Método:** `PUT`
- **URL:** `{{baseUrl}}/api/viajes/{{viajeId}}`
- **Body:** raw JSON, mismo formato que el alta:

```json
{
  "nombre": "Circuito de prueba editado",
  "ubicacion": {
    "ciudad": "Ciudad de Córdoba",
    "localidad": "Córdoba",
    "latitud": -31.42,
    "longitud": -64.18
  },
  "rangoInteresKm": 80,
  "fechaInicio": "{{fechaInicio}}",
  "fechaFin": "{{fechaFin}}",
  "ritmo": "INTENSIVO",
  "intereses": ["NATURALEZA", "CULTURA", "GASTRONOMIA"],
  "usuario": "{{usuario}}"
}
```

- **Status esperado:** `200 OK`
- **Nota:** no se puede modificar un viaje `EN_CURSO` ni `FINALIZADO` (`400`). Un `BORRADOR`
  o un `CANCELADO` responde `404` por esta ruta.

### 5.6 `DELETE /api/viajes/{id}` — baja lógica

- **Método:** `DELETE`
- **URL:** `{{baseUrl}}/api/viajes/{{viajeId}}`
- **Body:** no lleva.
- **Status esperado:** `204 No Content`
- **Nota:** el viaje no se borra: pasa a `CANCELADO`. Después, `GET /api/viajes/{{viajeId}}`
  responde `404` y deja de aparecer en los listados.

## 6. Endpoints de borradores

### 6.1 `POST /api/viajes/borradores` — crear borrador

- **Método:** `POST`
- **URL:** `{{baseUrl}}/api/viajes/borradores`
- **Body:** raw JSON

```json
{
  "nombre": "Borrador de prueba",
  "ubicacion": {
    "ciudad": "Carlos Paz",
    "localidad": "Córdoba",
    "latitud": -31.42,
    "longitud": -64.50
  },
  "rangoInteresKm": 50,
  "fechaInicio": "{{fechaInicioBorrador}}",
  "fechaFin": "{{fechaFinBorrador}}",
  "ritmo": "TRANQUILO",
  "pasoActual": 3,
  "interesesCategoria": ["CULTURA", "NATURALEZA"],
  "usuario": "{{usuario}}"
}
```

- **Status esperado:** `201 Created`
- **Nota:** `pasoActual` es obligatorio y `interesesCategoria` no puede venir vacío. Guardar
  el `id` en `borradorId`.

### 6.2 `GET /api/viajes/borradores` — listar borradores

- **Método:** `GET`
- **URL:** `{{baseUrl}}/api/viajes/borradores?usuario={{usuario}}&page=0&size=20`
- **Params:**

  | Key | Value |
  |---|---|
  | `usuario` | `{{usuario}}` |
  | `page` | `0` |
  | `size` | `20` |

- **Body:** no lleva.
- **Status esperado:** `200 OK`
- **Nota:** devuelve solo los borradores del usuario, del más reciente al más antiguo.

### 6.3 `GET /api/viajes/borradores/{id}` — detalle del borrador

- **Método:** `GET`
- **URL:** `{{baseUrl}}/api/viajes/borradores/{{borradorId}}`
- **Body:** no lleva.
- **Status esperado:** `200 OK`
- **Nota:** si el id no existe o no es un borrador, responde `404`.

### 6.4 `PUT /api/viajes/borradores/{id}` — modificar borrador

- **Método:** `PUT`
- **URL:** `{{baseUrl}}/api/viajes/borradores/{{borradorId}}`
- **Body:** raw JSON, mismo formato que el alta:

```json
{
  "nombre": "Borrador de prueba editado",
  "ubicacion": {
    "ciudad": "Carlos Paz",
    "localidad": "Córdoba",
    "latitud": -31.42,
    "longitud": -64.50
  },
  "rangoInteresKm": 60,
  "fechaInicio": "{{fechaInicioBorrador}}",
  "fechaFin": "{{fechaFinBorrador}}",
  "ritmo": "EQUILIBRADO",
  "pasoActual": 5,
  "interesesCategoria": ["CULTURA", "NATURALEZA", "GASTRONOMIA"],
  "usuario": "{{usuario}}"
}
```

- **Status esperado:** `200 OK`
- **Nota:** el `usuario` del body debe coincidir con el dueño del borrador; si no, responde
  `404`.

### 6.5 `POST /api/viajes/borradores/{id}/completar` — completar borrador

- **Método:** `POST`
- **URL:** `{{baseUrl}}/api/viajes/borradores/{{borradorId}}/completar`
- **Body:** no lleva.
- **Status esperado:** `200 OK`
- **Nota:** pasa el borrador a `PLANIFICADO` y deja `pasoActual = 8`. Si faltan datos
  obligatorios responde `400`; si el id no es un borrador, `404`.

### 6.6 `DELETE /api/viajes/borradores/{id}` — descartar borrador

- **Método:** `DELETE`
- **URL:** `{{baseUrl}}/api/viajes/borradores/{{borradorId}}`
- **Body:** no lleva.
- **Status esperado:** `204 No Content`
- **Nota:** es baja lógica: el borrador pasa a `CANCELADO` y deja de listarse.

## 7. Endpoints de circuitos

### 7.1 `POST /api/viajes/{id}/circuito` — generar circuito

- **Método:** `POST`
- **URL:** `{{baseUrl}}/api/viajes/{{viajeId}}/circuito`
- **Body:** no lleva.
- **Status esperado:** `201 Created`
- **Nota:** genera tres alternativas (`CERCANIA`, `INTERESES`, `DESCUBRIMIENTO`) y las guarda
  como instantánea. **Solo se puede generar una vez por viaje**; si ya existe, responde `400`.
  El viaje debe tener fechas, zona con coordenadas, radio mayor a cero y ritmo. Si no hay
  propuestas compatibles devuelve `201` con alternativas vacías, no un error.

### 7.2 `GET /api/viajes/{id}/circuito` — consultar circuito

- **Método:** `GET`
- **URL:** `{{baseUrl}}/api/viajes/{{viajeId}}/circuito`
- **Body:** no lleva.
- **Status esperado:** `200 OK`
- **Nota:** devuelve las tres alternativas con sus ítems, distancias y métricas. Si el viaje
  todavía no tiene circuito generado, responde `404`.
- **Campos de cada ítem:** además de `propuestaId`, `nombre`, `descripcion`, `categoria`, `fecha`,
  `orden`, `horaInicio`, `horaFin`, `trasladoDesdeAnteriorMinutos` y `disponible`, la respuesta
  trae el snapshot visual y de ubicación: `imagenes`, `ciudad`, `localidad`, `direccion`,
  `lugarRecinto`, `latitud`, `longitud`, `tipoAcceso`, `montoEstimado`, `descripcionArancel`,
  `sitioOficial` y `duracionMinutos`. Verificar que `latitud`/`longitud` no sean nulos cuando la
  propuesta tenía ubicación.

### 7.3 `POST /api/viajes/{id}/circuito/seleccion` — seleccionar alternativa

- **Método:** `POST`
- **URL:** `{{baseUrl}}/api/viajes/{{viajeId}}/circuito/seleccion`
- **Body:** raw JSON

```json
{
  "estrategia": "INTERESES"
}
```

- **Status esperado:** `200 OK`
- **Nota:** los valores válidos son `CERCANIA`, `INTERESES` y `DESCUBRIMIENTO`. La selección
  se hace una sola vez: si ya hay una elegida, responde `400`. Si la estrategia no existe en
  el circuito generado, también `400`. Si no hay circuito, `404`.

### 7.4 Verificar la selección en el viaje

- **Método:** `GET`
- **URL:** `{{baseUrl}}/api/viajes/{{viajeId}}`
- **Body:** no lleva.
- **Status esperado:** `200 OK`
- **Nota:** el campo `circuito` deja de ser `null` y trae la alternativa seleccionada:

  ```json
  {
    "id": 1,
    "nombre": "Circuito de prueba en Córdoba",
    "circuito": {
      "generadoEn": "2026-10-27T12:00:00",
      "estrategia": "INTERESES",
      "alternativa": {
        "estrategia": "INTERESES",
        "propuestas": [],
        "distanciaTotalKm": 0.0,
        "afinidadIntereses": 0.0,
        "categoriasCubiertas": [],
        "advertencia": null
      },
      "distanciasEstimadas": true,
      "advertencia": null
    }
  }
  ```

  Los valores de `propuestas`, distancias y advertencia dependen de las propuestas cargadas
  y de las fechas del viaje.

## 8. Checklist rápido

- [ ] `POST /api/viajes` responde `201` y guarda `viajeId`.
- [ ] `GET /api/viajes?usuario=...` muestra el viaje creado.
- [ ] `GET /api/viajes/estado?usuario=...&estado=PLANIFICADO` lo muestra.
- [ ] `GET /api/viajes/{{viajeId}}` responde `200` y `circuito` es `null`.
- [ ] `PUT /api/viajes/{{viajeId}}` responde `200`.
- [ ] `POST /api/viajes/{{viajeId}}/circuito` responde `201`.
- [ ] `GET /api/viajes/{{viajeId}}/circuito` responde `200` con tres alternativas.
- [ ] `POST /api/viajes/{{viajeId}}/circuito/seleccion` responde `200`.
- [ ] `GET /api/viajes/{{viajeId}}` incluye la alternativa seleccionada.
- [ ] Regenerar el circuito responde `400`.
- [ ] Volver a seleccionar responde `400`.
- [ ] `POST /api/viajes/borradores` responde `201` y guarda `borradorId`.
- [ ] `GET /api/viajes/borradores?usuario=...` lista el borrador.
- [ ] `GET /api/viajes/borradores/{{borradorId}}` responde `200`.
- [ ] `PUT /api/viajes/borradores/{{borradorId}}` responde `200`.
- [ ] `POST /api/viajes/borradores/{{borradorId}}/completar` responde `200` con estado `PLANIFICADO`.
- [ ] Un segundo borrador se elimina con `DELETE /api/viajes/borradores/{id}` y responde `204`.
- [ ] `DELETE /api/viajes/{{viajeId}}` responde `204` y después el detalle da `404`.

## 9. Notas rápidas

- **`ViajeRequest` usa `intereses`**, no `interesesCategoria`. En cambio,
  **`ViajeBorradorRequest` usa `interesesCategoria`** y exige `pasoActual`.
- **Un viaje `BORRADOR` no se consulta con `GET /api/viajes/{id}`**: responde `404`. Usar
  `GET /api/viajes/borradores/{id}`.
- **El circuito no se regenera.** Para repetir la prueba, reiniciar la app o crear otro viaje.
- **La alternativa se selecciona una sola vez.** Para volver a probar, reiniciar o crear otro viaje.
- **Las fechas del viaje deben ser futuras.** El alta rechaza `fechaInicio` anterior a hoy.
- **Un viaje cancelado no puede generar circuito** (`404`), porque la búsqueda excluye
  `CANCELADO`.
- **Las distancias son estimadas:** se calculan con Haversine y una velocidad media de 30 km/h,
  por eso la respuesta trae `distanciasEstimadas: true`.
- **`GET /api/viajes/{id}/circuito` actualiza la disponibilidad** de los ítems antes de
  responder. Si una propuesta incluida fue dada de baja, el ítem sigue apareciendo pero con
  `disponible: false`.
- **No hay autenticación todavía:** no hace falta token ni header `Authorization`.
