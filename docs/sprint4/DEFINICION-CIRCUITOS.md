# Sprint 4 — Definición de circuitos turísticos

> Documento curado a partir del análisis de `sprint4.md`.
> Alcance: VZ-25, VZ-26, VZ-28 y VZ-29.
> Estado: definición acordada para implementar por fases.

## 1. Resumen ejecutivo

El Sprint 3 dejó implementada la generación de circuitos con tres alternativas,
selección única y consulta. No dejó snapshot de parámetros ni edición de ítems.
El Sprint 4 redefine VZ-25, agrega VZ-26 y suma VZ-28/VZ-29 sobre la alternativa
seleccionada.

Decisiones principales:

1. Se mantienen las tres alternativas y la selección.
2. El circuito consultable y editable es la alternativa seleccionada.
3. Reemplazar y eliminar operan solo sobre la alternativa seleccionada.
4. Los intereses son un filtro estricto y además se aplica el radio del viaje.
5. La provincia de Córdoba se asume por invariante del dato, no por un filtro.
6. La confirmación es mixta: el backend responde `409` y la UI reintenta con un flag.
7. Se muestran todos los días del viaje, incluidos los pasados, con `items: []`
   cuando no tengan actividades.
8. La autenticación real queda diferida. No se simulan `401/403` ni se usa el
   parámetro `usuario` en los endpoints de circuito. Esos criterios quedan como
   deuda para la historia de autenticación.

## 2. Estado actual

| Pieza | Estado en el repositorio |
| --- | --- |
| Generación | `POST /api/viajes/{id}/circuito` crea tres alternativas (`CERCANIA`, `INTERESES`, `DESCUBRIMIENTO`). |
| Selección | `POST /api/viajes/{id}/circuito/seleccion` elige una alternativa. |
| Consulta | `GET /api/viajes/{id}/circuito` devuelve las alternativas. `GET /api/viajes/{id}` devuelve la seleccionada. |
| Regeneración | Prohibida: un segundo `POST` responde `400`. |
| Sin propuestas | Persiste alternativas vacías con `advertencia`; no falla. |
| Intereses | El motor prioriza, pero no exige que el ítem pertenezca a las preferencias. |
| Ubicación | Filtra por `rangoInteresKm` alrededor de `zonaInteres`; no existe `provincia`. |
| Autenticación | No hay Spring Security ni entidad `Usuario`; algunos endpoints usan `usuario` como texto. |
| Edición | VZ-28/VZ-29 no existen; en la UI los botones indican “Próximamente”. |
| Consulta desde “Mis viajes” | Las tarjetas confirmadas no tienen acceso al circuito guardado. |

## 3. Decisiones de alcance

| Tema | Decisión |
| --- | --- |
| Autenticación | Diferida. No se simulan `401/403` ni se agrega `usuario` a los endpoints de circuito. |
| Modelo | Se mantienen tres alternativas + selección. |
| Edición | Reemplazar y eliminar operan solo sobre la alternativa seleccionada. |
| Filtros | Intereses estrictos + radio. Córdoba por invariante. |
| Confirmación | Backend `409` + reintento con `?reemplazar=true` o `?confirmar=true`. |
| Días | Todos los días del viaje, incluidos los pasados, con `items: []`. |
| Controladores | Se crea `CircuitoController`; la URL pública sigue anidada bajo `/api/viajes/{id}/circuito`. |
| Orden de implementación | VZ-25 → VZ-26 → VZ-29 → VZ-28. |

## 4. Definición corregida

### VZ-25 — Generar circuito turístico

**Precondiciones**

- “Destino” es `Viaje.zonaInteres`.
- “Preferencias” son `Viaje.interesesCategoria`.
- Datos obligatorios: `fechaInicio`, `fechaFin`, `zonaInteres` con coordenadas,
  `rangoInteresKm > 0`, `ritmo` e `interesesCategoria` no vacío.
- Estados permitidos: borrador completo, `PLANIFICADO` y `EN_CURSO`.
  `FINALIZADO` y `CANCELADO` no pueden generar.
- Elegibilidad: propuesta activa, con ubicación y coordenadas, dentro del radio,
  con categoría perteneciente a los intereses y con al menos una franja válida
  dentro del rango de fechas.
- La pertenencia a Córdoba es un invariante del modelo, no un filtro adicional.

**Criterios de aceptación corregidos**

| CA | Regla |
| --- | --- |
| CA1 | Si el viaje cumple las precondiciones, se generan y persisten las tres alternativas. |
| CA2 | Si falta cualquier dato obligatorio, se responde `422` con `datosFaltantes: []`. No se genera nada. |
| CA3 | Solo se consideran propuestas dentro de `[fechaInicio, fechaFin]` y dentro del radio del destino. |
| CA4 | Todo candidato debe tener `categoria ∈ interesesCategoria`. Las estrategias solo ordenan dentro de ese conjunto. |
| CA5 | Los ítems de un mismo día no se solapan, respetan la disponibilidad y el tiempo estimado de traslado. Un evento sin horario usa 09:00–18:00. |
| CA6 | Si no hay ningún candidato elegible, se responde `422` y no se persiste un circuito vacío. |
| CA7 | Las alternativas generadas quedan persistidas y se consultan sin regenerar. La consulta del circuito seleccionado requiere que el usuario elija una alternativa. |
| CA8 | Si ya existe circuito, `POST` sin `?reemplazar=true` responde `409` con “requiere confirmación”. Con el flag reemplaza las alternativas; si había una estrategia seleccionada, intenta conservarla. Cancelar no modifica nada. |
| CA9 | Al generar se guarda un snapshot de fechas, zona, radio, ritmo e intereses. Al consultar se expone `desactualizado` y `motivosDesactualizacion` (`FECHAS`, `PREFERENCIAS`, `ZONA`, `RITMO`). No se regenera automáticamente. |

**Nota sobre autenticación:** VZ-25 no exige `401/403` en sus criterios actuales.
Los endpoints de generación no reciben `usuario`.

### VZ-26 — Consultar circuito turístico

**Endpoint**

`GET /api/viajes/{id}/circuito/seleccionado`

**Errores**

| Caso | Respuesta |
| --- | --- |
| Viaje inexistente | `404` |
| Sin circuito o sin alternativa seleccionada | `404` |
| Falta de autenticación o dueño distinto | Fuera de alcance por ahora; se implementará con auth real. |

**Criterios de aceptación corregidos**

| CA | Regla |
| --- | --- |
| CA1 | Se implementa `404` para viaje/circuito/selección inexistente. El `401/403` queda pendiente de autenticación y se documenta como deuda. |
| CA2 | La respuesta agrupa por día en `dias[]`. Los días van ordenados por fecha y los ítems por `horaInicio` ascendente, con `orden` como desempate. |
| CA3 | Cada ítem incluye `itemId`, nombre, tipo (`EVENTO`/`ACTIVIDAD`), categoría, ubicación, `horaInicio`, `horaFin` y `duracionMinutos`. |
| CA4 | Se incluyen todos los días de `[fechaInicio, fechaFin]`. Un día sin ítems aparece con `items: []` y el frontend muestra “sin actividades programadas”. |

**Respuesta propuesta**

```json
{
  "circuitoId": 1,
  "viajeId": 5,
  "generadoEn": "2026-11-07T10:00:00",
  "estrategia": "INTERESES",
  "desactualizado": true,
  "motivosDesactualizacion": ["FECHAS"],
  "distanciasEstimadas": true,
  "advertencia": null,
  "dias": [
    { "fecha": "2026-11-10", "items": [] },
    {
      "fecha": "2026-11-11",
      "items": [
        {
          "itemId": 15,
          "propuestaId": 3,
          "propuestaNombre": "Museo Histórico",
          "tipo": "EVENTO",
          "categoria": "HISTORIA",
          "ciudad": "Córdoba",
          "localidad": "Córdoba",
          "direccion": "...",
          "horaInicio": "10:00:00",
          "horaFin": "12:00:00",
          "duracionMinutos": 120
        }
      ]
    }
  ]
}
```

### VZ-28 — Reemplazar propuesta turística

**Endpoints**

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/viajes/{id}/circuito/seleccionado/items/{itemId}/alternativas` | Lista alternativas válidas. |
| `PUT` | `/api/viajes/{id}/circuito/seleccionado/items/{itemId}` | Reemplaza por `{ "propuestaId": 123 }`. |

**Reglas de alternativa**

- Misma `fecha` que el ítem reemplazado.
- Intervalo completo dentro del bloque original: `inicio >= original.inicio` y
  `fin <= original.fin`.
- Sin solaparse con otros ítems del día.
- Categoría dentro de `interesesCategoria` y distancia dentro del radio.
- Propuesta activa y con disponibilidad válida.
- No incluir propuestas ya presentes en la alternativa seleccionada ni el ítem
  reemplazado.
- Verificar traslado desde el ítem anterior y hacia el siguiente.

**Criterios de aceptación corregidos**

| CA | Regla |
| --- | --- |
| CA1 | Se implementa `404` para viaje/circuito/ítem inexistente. El `403` por circuito ajeno queda pendiente de autenticación. |
| CA2 | Se aplican las reglas anteriores. “Bloque horario” significa que la alternativa entra completa en el intervalo original. |
| CA3 | Se excluyen todos los ítems de la alternativa seleccionada y el ítem reemplazado. |
| CA4 | Al confirmar se reemplaza solo ese ítem. Se conservan fechas, órdenes y el resto de los ítems; se recalculan el traslado del ítem reemplazado y del siguiente, y las métricas del circuito. Esa es la única excepción a “resto sin cambios”. |
| CA5 | Cancelar es solo UI; no se llama a la API. |
| CA6 | Si no hay alternativas, `200` con `alternativas: []` y mensaje. Si se intenta reemplazar por una propuesta inválida, `409/422` y el ítem original no cambia. |

### VZ-29 — Eliminar propuesta turística

**Endpoint**

`DELETE /api/viajes/{id}/circuito/seleccionado/items/{itemId}?confirmar=true`

**Criterios de aceptación corregidos**

| CA | Regla |
| --- | --- |
| CA1 | Se implementa `404` para viaje/circuito/ítem inexistente. El `403` por circuito ajeno queda pendiente de autenticación. |
| CA2 | Sin `confirmar=true`, responde `409` indicando que requiere confirmación. La UI muestra el diálogo y reintenta con el flag. Sin confirmación, el ítem se conserva. |
| CA3 | Tras eliminar, el ítem no aparece en la consulta ni en el mapa; se invalida la caché del viaje/circuito. |
| CA4 | Si el día queda vacío, se devuelve igual con `items: []`. El circuito no se elimina aunque quede sin ítems. |
| CA5 | Se renumera `orden` por día, se recalcula el traslado del ítem siguiente y se recalculan `distanciaTotalKm`, `afinidadIntereses` y `categoriasCubiertas`. La respuesta devuelve el circuito actualizado. |

## 5. Contrato de API

| Método | Ruta | Respuesta |
| --- | --- | --- |
| `POST` | `/api/viajes/{id}/circuito` | `201`; `409` si existe sin `?reemplazar=true`; `200` con el flag. |
| `GET` | `/api/viajes/{id}/circuito` | `200` con las alternativas; `404` sin circuito. |
| `POST` | `/api/viajes/{id}/circuito/seleccion` | `200` con la alternativa seleccionada. |
| `GET` | `/api/viajes/{id}/circuito/seleccionado` | `200` con días e ítems; `404` sin selección. |
| `GET` | `/api/viajes/{id}/circuito/seleccionado/items/{itemId}/alternativas` | `200` con alternativas. |
| `PUT` | `/api/viajes/{id}/circuito/seleccionado/items/{itemId}` | `200` con el circuito actualizado. |
| `DELETE` | `/api/viajes/{id}/circuito/seleccionado/items/{itemId}?confirmar=true` | `200` con el circuito actualizado; `409` sin confirmar. |

**Códigos de error**

| Código | Uso |
| --- | --- |
| `400` | Parámetros inválidos. |
| `404` | Viaje, circuito, selección o ítem inexistente. |
| `409` | Confirmación requerida o reemplazo inválido. |
| `422` | Datos faltantes, sin propuestas compatibles o alternativa inválida. |
| `401/403` | Fuera de alcance hasta la autenticación real. |

## 6. Modelo de datos

- `CircuitoItemResponse` agrega `itemId`.
- `Circuito` agrega un snapshot de generación: fechas, intereses, zona, radio y ritmo.
- `CircuitoResponse` agrega `desactualizado` y `motivosDesactualizacion`.
- Nuevos DTO: `CircuitoSeleccionadoResponse`, `DiaCircuitoResponse` y
  `AlternativaItemResponse`.
- Las alternativas de reemplazo se calculan al momento; no se persisten.
- No se agrega `provincia`: se documenta el invariante de que todas las
  ubicaciones cargadas pertenecen a Córdoba.

## 7. Ubicación de los endpoints

Se crea `CircuitoController` con:

```java
@RequestMapping("/api/viajes/{viajeId}/circuito")
```

Motivos:

- Cohesión: una sola familia de recursos.
- Tests más chicos: `@WebMvcTest(CircuitoController.class)` mockea solo
  `CircuitoService`.
- Centralización de confirmaciones y errores de circuito.
- Menos dependencias en `ViajeController`.

La URL pública no cambia. `GET /api/viajes/{id}` sigue en `ViajeController`
porque es la vista del viaje e incluye el circuito seleccionado.
`ViajeService` puede seguir usando `CircuitoService.selected(...)`.

## 8. Plan de implementación

### Fase 0 — Documentación y contrato

- Crear este documento.
- Confirmar el orden de fases y los nombres de endpoints.
- Registrar la línea base de tests.

Salida: documento acordado, sin cambios de código.

### Fase 1 — VZ-25

Backend:

- Crear `CircuitoController` y mover los endpoints existentes.
- Mover tests de circuito a `CircuitoControllerTest`.
- Quitar `CircuitoService` de `ViajeController`.
- Exigir intereses no vacíos.
- Filtrar candidatos por interés estricto y radio.
- Fallar con `422` si no hay candidatos y no persistir.
- Guardar snapshot de generación.
- Implementar `desactualizado` y motivos.
- Implementar regeneración con `409` + `?reemplazar=true`.
- Conservar la estrategia seleccionada si sigue existiendo.
- Agregar `itemId` a `CircuitoItemResponse`.

Frontend:

- Pasar los cambios de contrato (`itemId`, `409`, `?reemplazar=true`).
- Agregar acción de regenerar con confirmación.
- El aviso de circuito desactualizado se implementa en la Fase 2, cuando la consulta del
  circuito seleccionado expone `desactualizado` y `motivosDesactualizacion`.

Salida: VZ-25 completa y verificada.

### Fase 2 — VZ-26

Backend:

- `GET /circuito/seleccionado`.
- Agrupar por días, incluir días vacíos y ordenar por hora.
- Devolver `404` ante recursos inexistentes.

Frontend:

- Página `/viajes/:id/circuito`.
- Link “Ver circuito” en tarjetas confirmadas.
- Render día por día con días vacíos.
- Banner de desactualizado y regeneración.

Salida: VZ-26 completa y verificada.

### Fase 3 — VZ-29

Backend:

- `DELETE /items/{itemId}` con confirmación.
- Renumerar, recalcular traslado siguiente y métricas.
- Mantener días y circuito vacíos.

Frontend:

- Acción eliminar con diálogo de confirmación.
- Invalidación de caché y actualización de la vista.

Salida: VZ-29 completa y verificada.

### Fase 4 — VZ-28

Backend:

- `GET /items/{itemId}/alternativas`.
- `PUT /items/{itemId}` con `propuestaId`.
- Validar fecha, bloque, solapamiento, intereses, radio y traslados.
- Recalcular traslados y métricas.

Frontend:

- Modal o panel de alternativas.
- Confirmar reemplazo y actualizar la vista.
- Mensaje cuando no hay alternativas.

Salida: VZ-28 completa y verificada.

### Fase 5 — Cierre

- Suite completa de backend y frontend.
- Pruebas manuales en Postman del flujo completo.
- Actualizar `CIRCUITOS-AUTOMATICOS.md`, `AGENTS.md` y pruebas manuales.
- Revisar límites y deuda.

Salida: sprint integrado y documentado.

## 9. Deuda y límites

- **Autenticación:** sin login real no hay `401/403`. VZ-26 CA1, VZ-28 CA1 y
  VZ-29 CA1 quedan parcialmente cumplidos; se implementa `404` y la
  funcionalidad. La autorización y la propiedad de los viajes quedan para la
  historia de autenticación.
- **Provincia por invariante:** no hay filtro geográfico de provincia; se asume
  que todas las ubicaciones cargadas son de Córdoba.
- **“Resto sin cambios” no es literal:** reemplazar/eliminar recalcula traslados
  y métricas para que el mapa siga siendo coherente.
- **Duración de eventos:** se usa el bloque `horaInicio–horaFin`; no existe un
  campo de duración propia del evento.
- **Días pasados:** se muestran vacíos porque la generación planifica desde
  `max(hoy, fechaInicio)`.
- **Regenerar descarta ediciones manuales** de reemplazos/eliminaciones previas.

## 10. Verificación

```powershell
cd turismo-backend
.\mvnw.cmd clean test

cd ..\turismo-frontend
npm run typecheck
npm run lint
npm test -- --run
```

Línea base registrada el 2026-11-08:

- Backend: 229 tests, 2 fallos preexistentes:
  `ViajeMapperTest.mapsRequestToEntity` y `ViajeTest.rejectsPastStartDate`.
- Frontend typecheck: OK.
- Frontend lint: OK con 6 warnings preexistentes.
- Frontend tests: 182 tests, 9 fallos preexistentes en
  `src/pages/eventos-page.test.tsx` (8) y
  `src/pages/evento-editar-page.test.tsx` (1).

Verificación de la Fase 1:

- Backend: 235 tests, 2 fallos preexistentes. `CircuitoControllerTest` (8),
  `CircuitoServiceTest` (12) y `ViajeControllerTest` (17) en verde.
- Frontend typecheck: OK.
- Frontend lint: OK con 6 warnings preexistentes.
- Frontend tests: 183 tests, 9 fallos preexistentes en los mismos dos archivos.

Verificación de la Fase 2:

- Backend: 240 tests, 2 fallos preexistentes. `CircuitoControllerTest` (10) y
  `CircuitoServiceTest` (15) en verde, incluidos agrupado por días, días vacíos, orden por
  `horaInicio` y `404` sin viaje/circuito/selección.
- Frontend typecheck: OK.
- Frontend lint: OK con 6 warnings preexistentes.
- Frontend tests: 186 tests, 9 fallos preexistentes en los mismos dos archivos; los 3 tests de
  `circuito-page.test.tsx` en verde.
