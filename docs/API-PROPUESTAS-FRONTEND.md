# API de propuestas para el frontend — Sprint 3

> **Documento principal:** [`CAMBIOS-Y-DECISIONES-SPRINT-3.md`](./CAMBIOS-Y-DECISIONES-SPRINT-3.md)
>
> Este documento describe el contrato HTTP que consume el frontend: rutas, parámetros, ejemplos de request/response, errores y tipos TypeScript. Ante cualquier duda de negocio o de implementación, consultar el documento principal.

## 1. Convenciones generales

- **Base URL en desarrollo:** `http://localhost:8080`
- **Formato:** JSON UTF-8.
- **Fechas:** `YYYY-MM-DD` (`LocalDate`).
- **Horas:** `HH:mm:ss` (`LocalTime`).
- **Fechas y horas de viaje:** ISO-8601 (`LocalDateTime`), por ejemplo `2026-10-21T18:03:09`.
- **Enums:** siempre en mayúsculas y con guion bajo. Un valor inválido responde **400**.
- **Paginación:** parámetros `page` (desde 0) y `size` (máximo 100, por defecto 20).
- **Orden:** `sort=campo,asc` o `sort=campo,desc`. Se pueden mandar varios `sort`.
- **Respuesta paginada:** `PagedModel` de Spring Data.

```json
{
  "content": [],
  "page": {
    "size": 20,
    "number": 0,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

## 2. Enums

### `TipoRegistro` (`tipo`)

```text
EVENTO
ACTIVIDAD
```

### `TipoPropuesta`

```text
FERIA
CONGRESO
ENCUENTRO
DEPORTIVO
ESPECTACULO
JORNADA
EXPOSICION
VISITA_GUIADA
FESTIVAL
```

Permitidos por subtipo:

- **Evento:** todos menos `VISITA_GUIADA`.
- **Actividad:** `VISITA_GUIADA` y `DEPORTIVO`.

### `InteresCategoria`

```text
NATURALEZA
GASTRONOMIA
CULTURA
HISTORIA
AVENTURA
VIDA_NOCTURNA
MUSICA
COMPRAS
FAMILIAR_Y_RELAX
```

### `Modalidad`

```text
PEDESTRE
CICLISTA
AUTOMOVILÍSTICA
FERROVIARIA
NÁUTICA
ECUESTRE
ACCESIBLE
```

### `TipoAcceso`

```text
GRATUITO
DE_PAGO
```

### `NombreEstado` (`estadoPropuesta.nombre`)

```text
INICIADO
REPROGRAMADO
CANCELADO
FINALIZADO
```

### `DayOfWeek` (`disponibilidades[].diaSemana`)

```text
MONDAY
TUESDAY
WEDNESDAY
THURSDAY
FRIDAY
SATURDAY
SUNDAY
```

## 3. Objetos de respuesta

### 3.1 `EstadoPropuesta`

```json
{
  "id": 1,
  "nombre": "INICIADO",
  "descripcion": "Propuesta registrada y pendiente de ejecución"
}
```

### 3.2 `EventoResponse`

```json
{
  "id": 1,
  "tipo": "EVENTO",
  "nombre": "Festival Nacional de Folklore de Cosquín",
  "descripcion": "Tradicional festival folklórico...",
  "tipoPropuesta": "FESTIVAL",
  "categoria": "CULTURA",
  "modalidad": "PEDESTRE",
  "tipoAcceso": "DE_PAGO",
  "estadoPropuesta": {
    "id": 1,
    "nombre": "INICIADO",
    "descripcion": "Propuesta registrada y pendiente de ejecución"
  },
  "montoEstimado": 25000,
  "descripcionArancel": "Entrada general",
  "sitioOficial": "https://festivaldecosquin.com",
  "lugarRecinto": "Plaza Próspero Molina",
  "localidad": "Cosquín",
  "direccion": "Av. San Martín 800, Cosquín",
  "latitud": -31.4135,
  "longitud": -64.4947,
  "fechaInicio": "2026-10-01",
  "fechaFin": "2026-10-03",
  "horarioInicio": "20:00:00",
  "horarioFin": "23:30:00",
  "imagenes": [
    "https://cdn.cordoba.gob.ar/folklore.jpg"
  ],
  "publicadorId": 2,
  "publicadorNombre": "Municipalidad de Cosquín"
}
```

### 3.3 `ActividadResponse`

```json
{
  "id": 9,
  "tipo": "ACTIVIDAD",
  "nombre": "Visita guiada por el Casco Histórico",
  "descripcion": "Recorrido a pie por las calles, plazas y edificios históricos.",
  "tipoPropuesta": "VISITA_GUIADA",
  "categoria": "CULTURA",
  "modalidad": "PEDESTRE",
  "tipoAcceso": "GRATUITO",
  "estadoPropuesta": {
    "id": 1,
    "nombre": "INICIADO",
    "descripcion": "Propuesta registrada y pendiente de ejecución"
  },
  "lugarRecinto": "Cabildo de Cosquín",
  "localidad": "Cosquín",
  "direccion": "Av. San Martín 800, Cosquín",
  "latitud": -31.4135,
  "longitud": -64.4947,
  "duracionMinutos": 90,
  "disponibilidades": [
    {
      "diaSemana": "MONDAY",
      "horaInicio": "09:00:00",
      "horaFin": "11:00:00"
    },
    {
      "diaSemana": "WEDNESDAY",
      "horaInicio": "15:00:00",
      "horaFin": "17:00:00"
    }
  ],
  "imagenes": [],
  "publicadorId": 2,
  "publicadorNombre": "Municipalidad de Cosquín"
}
```

### 3.4 `PropuestaResumenResponse`

Es el objeto del listado unificado. Tiene los campos de ambos subtipos; los que no aplican vienen en `null`.

```json
{
  "id": 1,
  "tipo": "EVENTO",
  "nombre": "Festival Nacional de Folklore de Cosquín",
  "descripcion": "Tradicional festival folklórico...",
  "tipoPropuesta": "FESTIVAL",
  "categoria": "CULTURA",
  "modalidad": "PEDESTRE",
  "tipoAcceso": "DE_PAGO",
  "estadoPropuesta": {
    "id": 1,
    "nombre": "INICIADO",
    "descripcion": "Propuesta registrada y pendiente de ejecución"
  },
  "lugarRecinto": "Plaza Próspero Molina",
  "localidad": "Cosquín",
  "direccion": "Av. San Martín 800, Cosquín",
  "latitud": -31.4135,
  "longitud": -64.4947,
  "fechaInicio": "2026-10-01",
  "fechaFin": "2026-10-03",
  "horarioInicio": "20:00:00",
  "horarioFin": "23:30:00",
  "duracionMinutos": null,
  "imagenes": [
    "https://cdn.cordoba.gob.ar/folklore.jpg"
  ],
  "publicadorId": 2,
  "publicadorNombre": "Municipalidad de Cosquín"
}
```

Para una actividad, `fechaInicio`, `fechaFin`, `horarioInicio` y `horarioFin` vienen en `null`, y `duracionMinutos` trae el valor:

```json
{
  "id": 9,
  "tipo": "ACTIVIDAD",
  "nombre": "Visita guiada por el Casco Histórico",
  "descripcion": "Recorrido a pie por las calles, plazas y edificios históricos.",
  "tipoPropuesta": "VISITA_GUIADA",
  "categoria": "CULTURA",
  "modalidad": "PEDESTRE",
  "tipoAcceso": "GRATUITO",
  "estadoPropuesta": {
    "id": 1,
    "nombre": "INICIADO",
    "descripcion": "Propuesta registrada y pendiente de ejecución"
  },
  "lugarRecinto": "Cabildo de Cosquín",
  "localidad": "Cosquín",
  "direccion": "Av. San Martín 800, Cosquín",
  "latitud": -31.4135,
  "longitud": -64.4947,
  "fechaInicio": null,
  "fechaFin": null,
  "horarioInicio": null,
  "horarioFin": null,
  "duracionMinutos": 90,
  "imagenes": [],
  "publicadorId": 2,
  "publicadorNombre": "Municipalidad de Cosquín"
}
```

## 4. Eventos

### 4.1 Crear evento — `POST /api/eventos`

**Request**

```json
{
  "nombre": "Festival de Folklore",
  "descripcion": "Encuentro de música y danza.",
  "categoria": "CULTURA",
  "modalidad": "PEDESTRE",
  "tipoPropuesta": "FESTIVAL",
  "tipoAcceso": "DE_PAGO",
  "montoEstimado": 25000,
  "descripcionArancel": "Entrada general",
  "sitioOficial": "https://festivaldecosquin.com",
  "lugarRecinto": "Plaza Próspero Molina",
  "localidad": "Cosquín",
  "direccion": "Av. San Martín 800, Cosquín",
  "fechaInicio": "2026-10-01",
  "fechaFin": "2026-10-03",
  "horarioInicio": "20:00:00",
  "horarioFin": "23:30:00",
  "imagenes": [
    "https://cdn.cordoba.gob.ar/folklore.jpg"
  ],
  "publicadorId": 2
}
```

**Campos**

| Campo | Tipo | Obligatorio | Observaciones |
| --- | --- | --- | --- |
| `nombre` | string | Sí | No vacío. |
| `descripcion` | string | No | Texto libre. |
| `categoria` | `InteresCategoria` | No | — |
| `modalidad` | `Modalidad` | No | — |
| `tipoPropuesta` | `TipoPropuesta` | Sí (dominio) | Si falta o no corresponde a evento, responde 422. |
| `tipoAcceso` | `TipoAcceso` | No | Si falta, se asume `GRATUITO`. |
| `montoEstimado` | number | Si `tipoAcceso = DE_PAGO` | No negativo. |
| `descripcionArancel` | string | No | — |
| `sitioOficial` | string | Si `tipoAcceso = DE_PAGO` | Debe empezar con `http://` o `https://`. |
| `lugarRecinto` | string | Sí | No vacío. |
| `localidad` | string | Sí | Ciudad. No vacía. |
| `direccion` | string | Sí | Dirección exacta. No vacía. |
| `fechaInicio` | date | Sí | `YYYY-MM-DD`. |
| `fechaFin` | date | Sí | No anterior a `fechaInicio`. |
| `horarioInicio` | time | No | `HH:mm:ss`. |
| `horarioFin` | time | No | Si ambos horarios vienen, debe ser posterior. |
| `imagenes` | string[] | No | URLs. Si falta, queda `[]`. |
| `publicadorId` | number | Sí | Debe existir; si no, 404. |

**Respuesta: 201 Created**

Devuelve el `EventoResponse` completo (ver sección 3.2).

**Errores típicos**

- `400`: validación de campos, fechas invertidas, evento `DE_PAGO` sin monto/sitio, dirección no geocodificable.
- `404`: no existe el publicador.
- `422`: falta `tipoPropuesta` o no es válido para un evento.

### 4.2 Actualizar evento — `PUT /api/eventos/{id}`

Mismo body que el alta. Devuelve `200` con el `EventoResponse` actualizado.

Notas:

- Es una actualización completa: conviene enviar el formulario entero.
- `imagenes: null` conserva las imágenes actuales; `imagenes: []` las vacía.
- `tipoAcceso: null` conserva el actual.
- Si el evento está `CANCELADO` o `FINALIZADO`, responde **400**.
- Si otro usuario modificó el evento, responde **409**.

### 4.3 Obtener evento — `GET /api/eventos/{id}`

- `200` con `EventoResponse`.
- `404` si no existe.

### 4.4 Listar eventos — `GET /api/eventos?page=0&size=20`

Devuelve una página de `EventoResponse`, ordenada por `fechaInicio` y luego `horarioInicio` ascendente.

### 4.5 Eliminar evento — `DELETE /api/eventos/{id}`

- `204 No Content`.
- `404` si no existe.

## 5. Actividades

### 5.1 Crear actividad — `POST /api/actividades`

**Request**

```json
{
  "nombre": "Visita guiada por el Casco Histórico",
  "descripcion": "Recorrido a pie por las calles, plazas y edificios históricos.",
  "categoria": "CULTURA",
  "modalidad": "PEDESTRE",
  "tipoPropuesta": "VISITA_GUIADA",
  "tipoAcceso": "GRATUITO",
  "lugarRecinto": "Cabildo de Cosquín",
  "localidad": "Cosquín",
  "direccion": "Av. San Martín 800, Cosquín",
  "duracionMinutos": 90,
  "disponibilidades": [
    {
      "diaSemana": "MONDAY",
      "horaInicio": "09:00:00",
      "horaFin": "11:00:00"
    },
    {
      "diaSemana": "WEDNESDAY",
      "horaInicio": "15:00:00",
      "horaFin": "17:00:00"
    }
  ],
  "imagenes": [],
  "publicadorId": 2
}
```

**Campos**

| Campo | Tipo | Obligatorio | Observaciones |
| --- | --- | --- | --- |
| `nombre` | string | Sí | No vacío. |
| `descripcion` | string | No | Texto libre. |
| `categoria` | `InteresCategoria` | No | — |
| `modalidad` | `Modalidad` | No | — |
| `tipoPropuesta` | `TipoPropuesta` | Sí (dominio) | Solo `VISITA_GUIADA` o `DEPORTIVO`. |
| `tipoAcceso` | `TipoAcceso` | No | Si falta, se asume `GRATUITO`. |
| `lugarRecinto` | string | Sí | No vacío. |
| `localidad` | string | Sí | Ciudad. No vacía. |
| `direccion` | string | Sí | Dirección exacta. No vacía. |
| `duracionMinutos` | number | Sí | Entero mayor a 0. |
| `disponibilidades` | array | No | Si falta, queda `[]`. |
| `disponibilidades[].diaSemana` | `DayOfWeek` | Sí | Si se envía una franja. |
| `disponibilidades[].horaInicio` | time | Sí | Si se envía una franja. |
| `disponibilidades[].horaFin` | time | Sí | Debe ser posterior a `horaInicio`. |
| `imagenes` | string[] | No | URLs. |
| `publicadorId` | number | Sí | Debe existir; si no, 404. |

**Respuesta: 201 Created**

Devuelve el `ActividadResponse` completo (ver sección 3.3).

**Errores típicos**

- `400`: campos vacíos, `duracionMinutos <= 0`, dirección no geocodificable.
- `404`: no existe el publicador.
- `422`: `tipoPropuesta` ausente o no válido para actividad, o franja horaria incoherente.

### 5.2 Actualizar actividad — `PUT /api/actividades/{id}`

Mismo body que el alta. Devuelve `200` con el `ActividadResponse`.

Notas:

- `disponibilidades: null` conserva las franjas actuales; `disponibilidades: []` las vacía.
- `imagenes: null` conserva las imágenes actuales; `imagenes: []` las vacía.
- Si la actividad está `CANCELADO` o `FINALIZADO`, responde **400**.
- Si hay conflicto de versión, responde **409**.

### 5.3 Obtener actividad — `GET /api/actividades/{id}`

- `200` con `ActividadResponse`.
- `404` si no existe.

### 5.4 Listar actividades — `GET /api/actividades?page=0&size=20`

Devuelve una página de `ActividadResponse`, ordenada por `nombre` ascendente.

### 5.5 Eliminar actividad — `DELETE /api/actividades/{id}`

- `204 No Content`.
- `404` si no existe.

## 6. Listado unificado — `GET /api/propuestas`

Devuelve eventos y actividades en una sola página de `PropuestaResumenResponse`.

### 6.1 Parámetros

| Parámetro | Tipo | Observaciones |
| --- | --- | --- |
| `tipo` | `TipoRegistro` | `EVENTO` o `ACTIVIDAD`. |
| `tipoPropuesta` | `TipoPropuesta` | Filtro exacto. |
| `categoria` | `InteresCategoria` | Filtro exacto. |
| `modalidad` | `Modalidad` | Filtro exacto. |
| `tipoAcceso` | `TipoAcceso` | Filtro exacto. |
| `estado` | `NombreEstado` | Filtro exacto. |
| `publicadorId` | number | Filtro exacto. |
| `localidad` | string | Comparación exacta, sin distinguir mayúsculas ni tildes. |
| `ubicacion` | string | Texto libre sobre `localidad`, `lugarRecinto` y `direccion`, sin distinguir mayúsculas ni tildes. |
| `q` | string | Busca en `nombre` y `descripcion`, sin distinguir mayúsculas. |
| `fechaDesde` | date | Solo con `tipo=EVENTO`. Eventos que terminan en esa fecha o después. |
| `fechaHasta` | date | Solo con `tipo=EVENTO`. Eventos que empiezan en esa fecha o antes. |
| `page` | number | Desde 0. |
| `size` | number | Máximo 100. |
| `sort` | string | Ver whitelist abajo. |

### 6.2 Orden permitido

| Campo | Requiere |
| --- | --- |
| `id`, `nombre`, `tipoPropuesta`, `categoria`, `modalidad`, `tipoAcceso` | Nada. |
| `fechaInicio`, `fechaFin`, `horarioInicio`, `horarioFin`, `montoEstimado` | `tipo=EVENTO`. |
| `duracionMinutos` | `tipo=ACTIVIDAD`. |

Sin `sort`, ordena por `nombre` ascendente. Un campo no permitido responde **400**.

### 6.3 Ejemplos

**Todos los eventos, ordenados por fecha:**

```http
GET /api/propuestas?tipo=EVENTO&sort=fechaInicio,asc&page=0&size=20
```

**Actividades de cultura:**

```http
GET /api/propuestas?tipo=ACTIVIDAD&categoria=CULTURA
```

**Búsqueda por texto y localidad:**

```http
GET /api/propuestas?q=folklore&localidad=Cosqu%C3%ADn
```

**Eventos vigentes en un rango:**

```http
GET /api/propuestas?tipo=EVENTO&fechaDesde=2026-10-01&fechaHasta=2026-10-31&sort=fechaInicio,asc
```

**Respuesta:**

```json
{
  "content": [
    {
      "id": 1,
      "tipo": "EVENTO",
      "nombre": "Festival Nacional de Folklore de Cosquín",
      "descripcion": "Tradicional festival folklórico...",
      "tipoPropuesta": "FESTIVAL",
      "categoria": "CULTURA",
      "modalidad": "PEDESTRE",
      "tipoAcceso": "DE_PAGO",
      "estadoPropuesta": {
        "id": 1,
        "nombre": "INICIADO",
        "descripcion": "Propuesta registrada y pendiente de ejecución"
      },
      "lugarRecinto": "Plaza Próspero Molina",
      "localidad": "Cosquín",
      "direccion": "Av. San Martín 800, Cosquín",
      "latitud": -31.4135,
      "longitud": -64.4947,
      "fechaInicio": "2026-10-01",
      "fechaFin": "2026-10-03",
      "horarioInicio": "20:00:00",
      "horarioFin": "23:30:00",
      "duracionMinutos": null,
      "imagenes": [],
      "publicadorId": 2,
      "publicadorNombre": "Municipalidad de Cosquín"
    }
  ],
  "page": {
    "size": 20,
    "number": 0,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

## 7. Agenda

### 7.1 Agenda turística — `GET /api/agenda` (VZ-18)

Devuelve solo **eventos** no cancelados, ordenados por `fechaInicio` y luego `horarioInicio`
ascendente (los más próximos primero). El orden es fijo: el parámetro `sort` se ignora.

```http
GET /api/agenda?fechaDesde=2026-10-01&fechaHasta=2026-10-31&tipoPropuesta=FESTIVAL&categoria=CULTURA&ubicacion=cosquin&tipoAcceso=GRATUITO&page=0&size=20
```

#### Parámetros

| Parámetro | Tipo | Observaciones |
| --- | --- | --- |
| `fechaDesde` | date | Si no se envía, el backend usa **hoy**. Incluye eventos que terminan ese día o después (solapamiento). |
| `fechaHasta` | date | Incluye eventos que empiezan ese día o antes (solapamiento). |
| `tipoPropuesta` | `TipoPropuesta` | Filtro exacto. |
| `categoria` | `InteresCategoria` | Filtro exacto. |
| `ubicacion` | string | Busca en `localidad`, `lugarRecinto` y `direccion`, sin distinguir mayúsculas ni tildes. |
| `tipoAcceso` | `TipoAcceso` | Filtro exacto (`GRATUITO` / `DE_PAGO`). |
| `page` | number | Desde 0. |
| `size` | number | Máximo 100, por defecto 20. |

#### Comportamiento

- `200` con página de `PropuestaResumenResponse` (ver 3.4), siempre con `tipo = "EVENTO"`.
- **Excluye `CANCELADO`.** Por defecto, con `fechaDesde = hoy`, también quedan fuera los eventos ya
  terminados.
- Las actividades nunca aparecen; se consultan por `/api/actividades` o
  `/api/propuestas?tipo=ACTIVIDAD`.
- Un `tipoPropuesta` o `categoria` inexistente responde **400**.
- Una fecha con formato inválido responde **400**.
- El detalle de cada evento se consulta en `GET /api/eventos/{id}` (CA3).

#### Ejemplo de respuesta

```json
{
  "content": [
    {
      "id": 1,
      "tipo": "EVENTO",
      "nombre": "Festival Nacional de Folklore de Cosquín",
      "descripcion": "Tradicional festival folklórico...",
      "tipoPropuesta": "FESTIVAL",
      "categoria": "CULTURA",
      "modalidad": "PEDESTRE",
      "tipoAcceso": "DE_PAGO",
      "estadoPropuesta": { "id": 1, "nombre": "INICIADO", "descripcion": null },
      "lugarRecinto": "Plaza Próspero Molina",
      "localidad": "Cosquín",
      "direccion": "Av. San Martín 800, Cosquín",
      "latitud": -31.4135,
      "longitud": -64.4947,
      "fechaInicio": "2026-10-01",
      "fechaFin": "2026-10-03",
      "horarioInicio": "20:00:00",
      "horarioFin": "23:30:00",
      "duracionMinutos": null,
      "imagenes": [],
      "publicadorId": 2,
      "publicadorNombre": "Municipalidad de Cosquín"
    }
  ],
  "page": { "size": 20, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

### 7.2 Agenda semanal — `GET /api/agenda/semanal` (US6)

Devuelve solo **eventos** de la semana ISO en curso (lunes a domingo), con la misma paginación.

```http
GET /api/agenda/semanal?page=0&size=20
```

- `200` con página de `EventoResponse`.
- No incluye actividades.
- El límite inferior es hoy, no el lunes: un evento que ya terminó esta semana no aparece.
- No acepta filtros: para filtrar por fecha, tipo, categoría, ubicación o acceso usar
  `/api/agenda`.

## 8. Eventos por publicador — `GET /api/publicadores/{id}/eventos`

```http
GET /api/publicadores/2/eventos?page=0&size=20
```

- `200` con página de `EventoResponse`.
- `404` si no existe el publicador.

## 9. Errores

### 9.1 Formato `ErrorResponse` (400, 404 y otros)

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "nombre: el nombre es obligatorio",
  "timestamp": "2026-10-21T18:03:09.897"
}
```

Se usa para:

- `400`: validación de body, fechas invertidas, orden inválido, parámetro con formato inválido, dirección no geocodificable, regla de negocio.
- `404`: recurso inexistente.
- `500`: error inesperado (sin detalle interno).

### 9.2 Formato `ProblemDetail` (422)

`Content-Type: application/problem+json`

```json
{
  "type": "about:blank",
  "title": "Regla de dominio incumplida",
  "status": 422,
  "detail": "el tipo FESTIVAL no es válido para una actividad"
}
```

Casos típicos:

- Falta `tipoPropuesta` o no corresponde al subtipo.
- Actividad sin duración positiva.
- Franja con hora de fin anterior o igual a la de inicio.
- Propuesta sin ubicación o sin publicador (si se saltara la validación de entrada).

### 9.3 Formato `ProblemDetail` (409)

`Content-Type: application/problem+json`

```json
{
  "type": "about:blank",
  "title": "Conflicto de concurrencia",
  "status": 409,
  "detail": "la propuesta fue modificada por otra persona; recargala e intentá de nuevo"
}
```

El frontend debería recargar el recurso y volver a intentar la edición.

## 10. Tipos TypeScript sugeridos

```ts
export type TipoRegistro = 'EVENTO' | 'ACTIVIDAD';

export type TipoPropuesta =
  | 'FERIA'
  | 'CONGRESO'
  | 'ENCUENTRO'
  | 'DEPORTIVO'
  | 'ESPECTACULO'
  | 'JORNADA'
  | 'EXPOSICION'
  | 'VISITA_GUIADA'
  | 'FESTIVAL';

export type InteresCategoria =
  | 'NATURALEZA'
  | 'GASTRONOMIA'
  | 'CULTURA'
  | 'HISTORIA'
  | 'AVENTURA'
  | 'VIDA_NOCTURNA'
  | 'MUSICA'
  | 'COMPRAS'
  | 'FAMILIAR_Y_RELAX';

export type Modalidad =
  | 'PEDESTRE'
  | 'CICLISTA'
  | 'AUTOMOVILÍSTICA'
  | 'FERROVIARIA'
  | 'NÁUTICA'
  | 'ECUESTRE'
  | 'ACCESIBLE';

export type TipoAcceso = 'GRATUITO' | 'DE_PAGO';

export type NombreEstado =
  | 'INICIADO'
  | 'REPROGRAMADO'
  | 'CANCELADO'
  | 'FINALIZADO';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface EstadoPropuesta {
  id: number;
  nombre: NombreEstado;
  descripcion: string | null;
}

export interface Page<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface DisponibilidadResponse {
  diaSemana: DayOfWeek;
  horaInicio: string;
  horaFin: string;
}

export interface EventoResponse {
  id: number;
  tipo: 'EVENTO';
  nombre: string;
  descripcion: string | null;
  tipoPropuesta: TipoPropuesta;
  categoria: InteresCategoria | null;
  modalidad: Modalidad | null;
  tipoAcceso: TipoAcceso;
  estadoPropuesta: EstadoPropuesta;
  montoEstimado: number | null;
  descripcionArancel: string | null;
  sitioOficial: string | null;
  lugarRecinto: string | null;
  localidad: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  fechaInicio: string;
  fechaFin: string;
  horarioInicio: string | null;
  horarioFin: string | null;
  imagenes: string[];
  publicadorId: number;
  publicadorNombre: string;
}

export interface ActividadResponse {
  id: number;
  tipo: 'ACTIVIDAD';
  nombre: string;
  descripcion: string | null;
  tipoPropuesta: TipoPropuesta;
  categoria: InteresCategoria | null;
  modalidad: Modalidad | null;
  tipoAcceso: TipoAcceso;
  estadoPropuesta: EstadoPropuesta;
  lugarRecinto: string | null;
  localidad: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  duracionMinutos: number;
  disponibilidades: DisponibilidadResponse[];
  imagenes: string[];
  publicadorId: number;
  publicadorNombre: string;
}

export interface PropuestaResumenResponse {
  id: number;
  tipo: TipoRegistro;
  nombre: string;
  descripcion: string | null;
  tipoPropuesta: TipoPropuesta;
  categoria: InteresCategoria | null;
  modalidad: Modalidad | null;
  tipoAcceso: TipoAcceso;
  estadoPropuesta: EstadoPropuesta;
  lugarRecinto: string | null;
  localidad: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horarioInicio: string | null;
  horarioFin: string | null;
  duracionMinutos: number | null;
  imagenes: string[];
  publicadorId: number;
  publicadorNombre: string;
}

export interface EventoRequest {
  nombre: string;
  descripcion?: string;
  categoria?: InteresCategoria;
  modalidad?: Modalidad;
  tipoPropuesta: TipoPropuesta;
  tipoAcceso?: TipoAcceso;
  montoEstimado?: number;
  descripcionArancel?: string;
  sitioOficial?: string;
  lugarRecinto: string;
  localidad: string;
  direccion: string;
  fechaInicio: string;
  fechaFin: string;
  horarioInicio?: string;
  horarioFin?: string;
  imagenes?: string[];
  publicadorId: number;
}

export interface ActividadRequest {
  nombre: string;
  descripcion?: string;
  categoria?: InteresCategoria;
  modalidad?: Modalidad;
  tipoPropuesta: TipoPropuesta;
  tipoAcceso?: TipoAcceso;
  lugarRecinto: string;
  localidad: string;
  direccion: string;
  duracionMinutos: number;
  disponibilidades?: DisponibilidadResponse[];
  imagenes?: string[];
  publicadorId: number;
}
```

## 11. Notas para la integración

1. **`localidad` es la ciudad**, no el barrio ni el nombre del recinto. La dirección exacta va en `direccion`.
2. **La geocodificación es obligatoria:** el backend resuelve latitud/longitud con Nominatim. Si la dirección no se encuentra, el alta/edición responde 400.
3. **`tipoPropuesta` es obligatorio para el dominio**, aunque el DTO no tenga `@NotNull`. Si falta, el alta puede pasar la validación de Bean Validation y fallar después con 422. Conviene enviarlo siempre.
4. **Un evento `DE_PAGO` exige `montoEstimado` y `sitioOficial`.**
5. **Las imágenes son URLs** ya disponibles; el backend no las descarga ni las transforma en este flujo.
6. **`imagenes: null` no borra**: en actualización conserva las existentes. Para borrar, enviar `[]`.
7. **`disponibilidades: null` no borra**: en actualización conserva las franjas. Para borrar, enviar `[]`.
8. **El listado unificado no reemplaza los listados por tipo**: `/api/eventos` y `/api/actividades` siguen existiendo con sus propios DTOs.
9. **Las agendas son solo de eventos**: `/api/agenda` (turística, con filtros y orden fijo) y
   `/api/agenda/semanal` (US6, semana en curso). Las actividades se consultan por
   `/api/actividades` o `/api/propuestas?tipo=ACTIVIDAD`.
10. **Un `sort` inválido devuelve 400**, no 500. Si se ordena por un campo de evento sin `tipo=EVENTO`, también devuelve 400.
