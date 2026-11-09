# Análisis de historias de usuario del sprint 4

**Session ID:** ses_e470fbcbdffeWicefzc2O5hkXk
**Created:** 11/7/2026, 11:15:16 PM
**Updated:** 11/7/2026, 11:41:59 PM

---

## User

bien vamos a trabajar sobre las historias de usuario que corresponden al sprint4 ahora, son las siguientes :
VZ-25 - Generar circuito turístico

Como turista, quiero que el sistema genere automáticamente un circuito turístico personalizado para un viaje registrado, a partir de mis fechas, preferencias de interés y disponibilidad de actividades y eventos en la Provincia de Córdoba, para planificar mi viaje sin tener que buscar y organizar la información manualmente.

CA1: El usuario debe tener un viaje registrado con fecha de inicio, fecha de fin y destino; si lo tiene y solicita generar el circuito, el sistema lo genera.

CA2: Si el viaje registrado tiene datos faltantes (fecha de inicio, fecha de fin, destino o preferencias de interés), el sistema no genera el circuito y notifica al usuario indicando qué datos faltan.

CA3: El circuito generado solo debe contemplar actividades y eventos que se realicen dentro del rango de fechas del viaje y dentro de la Provincia de Córdoba.

CA4: Los ítems del circuito deben corresponder a las preferencias de interés registradas en el viaje.

CA5: Los ítems de un mismo día no deben solaparse en horario y deben respetar la disponibilidad horaria de la actividad o evento.

CA6: Si no existen actividades ni eventos que cumplan fechas y preferencias del viaje, el sistema notifica al usuario y no genera un circuito vacío.

CA7: Una vez exitosa la generación, cuando el usuario vuelve a consultar el viaje, el circuito generado está disponible sin regenerarlo.

CA8: Si el viaje ya tiene un circuito generado y el usuario solicita generar nuevamente, el sistema solicita confirmación; si el usuario confirma, reemplaza el circuito existente, y si no, lo conserva sin cambios.

CA9: Si el usuario modifica las fechas o preferencias del viaje después de generado el circuito, el sistema le informa que el circuito puede estar desactualizado y le permite regenerarlo.

VZ-26 - Consultar circuito turístico

Como turista, quiero consultar el circuito turístico asociado a mi viaje, viendo día por día las actividades y eventos programados con sus horarios, duraciones y ubicación, para tener clara la planificación antes y durante el viaje.

CA1: El usuario solo puede consultar circuitos de sus propios viajes; si intenta acceder a uno ajeno, el sistema responde con error de autorización (403). Si el usuario no está autenticado responde 401, y si el viaje no tiene circuito generado o el circuito no existe responde 404.

CA2: Los ítems se agrupan por día y, dentro de cada día, se muestran en orden cronológico ascendente por hora de inicio.

CA3: Cada ítem del circuito debe mostrar nombre, tipo (actividad o evento), categoría, ubicación, hora de inicio y duración estimada.

CA4: Si un día del rango del viaje no tiene ítems, el sistema lo muestra indicando que no tiene actividades programadas.

VZ-28 - Reemplazar propuesta turística de circuito turístico

Como turista, quiero reemplazar una propuesta turística asociada a un circuito previamente generado a partir de un viaje registrado, para adaptarlo mejor a mis preferencias y gustos.

CA1: El usuario solo puede reemplazar ítems de circuitos de sus propios viajes; ante un circuito ajeno el sistema responde 403, y ante un ítem inexistente responde 404.

CA2: Las alternativas ofrecidas deben ser de la misma fecha que el ítem a reemplazar, tener un horario que entre en el bloque horario del ítem reemplazado sin solaparse con otros ítems del día, y corresponder a las preferencias registradas en el viaje asociado al circuito.

CA3: Las alternativas no deben incluir ítems que ya estén en el circuito ni el ítem que se está reemplazando.

CA4: El usuario debe poder seleccionar una de las alternativas; al confirmar, el ítem original es reemplazado por la alternativa elegida y el resto del circuito permanece sin cambios.

CA5: Si el usuario cancela o no selecciona ninguna alternativa, el circuito queda sin modificaciones.

CA6: Si no existen actividades o eventos que cumplan los criterios del CA2, el sistema notifica al usuario y conserva el ítem original.

VZ-29 - Eliminar propuesta turística de circuito turístico

Como turista, quiero poder quitar una actividad o evento del circuito turístico seleccionado, asociado a un viaje, para acotar las propuestas existentes y que el circuito se ajuste más a mis preferencias.

CA1: El usuario solo puede eliminar ítems de circuitos de sus propios viajes; ante un circuito ajeno el sistema responde 403, y ante un ítem inexistente responde 404.

CA2: Antes de eliminar el ítem, el sistema debe solicitar confirmación al usuario; si el usuario no confirma, el ítem se conserva.

CA3: Una vez eliminado, el ítem no debe aparecer en la consulta del circuito ni en su visualización en el mapa.

CA4: Si se elimina el último ítem de un día, el día se muestra sin actividades programadas (según VZ-26 CA4); el circuito no se elimina aunque quede sin ítems.

CA5: Tras la eliminación, la numeración de los marcadores y el recorrido del mapa se recalculan sin el ítem eliminado. 
analizalas y determina si estan bien definidas o no. La idea es definirlas correctamente y luego pasar a la implementacion

---

## Assistant

## Veredicto

**No están bien definidas para implementar tal cual.** Hay tres problemas de fondo:

1. **VZ-25 ya existe** (Sprint 3) con un modelo distinto al que describen los nuevos CA: genera 3 alternativas, exige seleccionar una, prohíbe regenerar, persiste circuitos vacíos y no filtra estrictamente por intereses.
2. **VZ-26, VZ-28 y VZ-29 dependen de autenticación**, que hoy no existe. Sin `Usuario`/login no se pueden cumplir los 401/403 ni la propiedad de los viajes.
3. **VZ-28 y VZ-29 no tienen contrato de API ni identidad de ítem.** Hoy `CircuitoItemResponse` no expone el `id` del ítem, y no hay rutas para listar alternativas, reemplazar ni eliminar.

Antes de escribir código hay que cerrar esas decisiones. Abajo está el detalle por historia.

---

## Estado actual que condiciona el sprint

| Pieza | Hoy |
| --- | --- |
| Generación | `POST /api/viajes/{id}/circuito` crea 3 alternativas (`CERCANIA`, `INTERESES`, `DESCUBRIMIENTO`). |
| Selección | `POST /api/viajes/{id}/circuito/seleccion` elige una sola vez. |
| Consulta | `GET /api/viajes/{id}/circuito` devuelve las 3 alternativas. `GET /api/viajes/{id}` devuelve solo la seleccionada. |
| Regeneración | Prohibida: segundo `POST` responde `400`. |
| Sin propuestas | Persiste alternativas vacías con `advertencia`; no falla. |
| Intereses | El motor prioriza, pero **no exige** que el ítem pertenezca a las preferencias. |
| Ubicación | Filtra por `rangoInteresKm` alrededor de `zonaInteres`; **no hay campo `provincia`**. |
| Auth | No hay Spring Security ni entidad `Usuario`; todo se identifica con `usuario` String. |
| Edición | VZ-28/29 no existen; en la UI los botones dicen “Próximamente”. |
| Consulta desde “Mis viajes” | Las tarjetas confirmadas no tienen link para abrir el circuito guardado. |

---

## VZ-25 — Generar circuito turístico

| CA | Problema | Propuesta |
| --- | --- | --- |
| CA1 | “Viaje registrado” y “destino” no están definidos. Hoy además se exige zona con coordenadas, radio y ritmo. | Definir destino = `zonaInteres`; decidir si radio y ritmo son obligatorios o tienen default. |
| CA2 | “Preferencias de interés” no se valida: hoy se puede generar sin intereses. No hay formato de notificación. | Exigir `interesesCategoria` no vacío; responder `400/422` con `datosFaltantes: [...]`. |
| CA3 | No existe `provincia`; el radio puede excluir propuestas válidas de Córdoba. Las actividades no tienen rango de fechas. | Agregar `provincia` a `Ubicacion` o documentar invariante; decidir si el radio filtra o solo ordena; definir vigencia de actividades. |
| CA4 | El motor admite propuestas fuera de interés como relleno, y `DESCUBRIMIENTO` premia la variedad. | Pre-filtrar candidatos por interés y que las estrategias solo ordenen dentro de ese conjunto. |
| CA5 | El solapamiento está resuelto, pero también se suma tiempo de traslado, que el CA no menciona. | Documentar que el traslado cuenta; definir evento sin horario (hoy 09–18). |
| CA6 | Hoy se persiste un circuito vacío con advertencia. | Fallar con `409/422` y **no persistir**; definir si falla cuando no hay ningún candidato o cuando una alternativa queda vacía. |
| CA7 | Generar no deja el circuito disponible: hace falta seleccionar una alternativa. | Decidir si se autoselecciona una o si “circuito generado” existe recién tras seleccionar. |
| CA8 | Hoy regenerar da `400`; no hay confirmación ni reemplazo. | Definir `confirmar/reemplazar` (flag o `409` + reintento) y qué se reemplaza. |
| CA9 | No hay snapshot de parámetros ni flag de desactualizado. | Guardar `fechaInicio`, `fechaFin`, `zona`, `radio`, `ritmo` e intereses al generar; exponer `desactualizado` y `motivos`. |

**Conclusión:** los CA 3, 4, 6, 7, 8 y 9 cambian comportamiento existente. No es “agregar VZ-25”, es **redefinir VZ-25**.

---

## VZ-26 — Consultar circuito turístico

| CA | Problema | Propuesta |
| --- | --- | --- |
| CA1 | No hay 401/403; `findCircuit` responde 404 sin validar dueño. Falta orden de validaciones. | Orden: `401` no autenticado → `404` viaje inexistente → `403` viaje ajeno → `404` sin circuito. Definir si se protegen todos los endpoints de viajes. |
| CA2 | Hoy devuelve lista plana ordenada por `orden`; el agrupado por día lo hace el frontend. | Exponer `dias: [{ fecha, items: [] }]` y ordenar por `horaInicio` ascendente; mantener `propuestas` planas si se quiere compatibilidad. |
| CA3 | Casi todos los campos existen, pero falta `itemId`; “duración” de un evento se calcula como bloque horario, no como duración real. | Exponer `itemId`, una `ubicacion` normalizada y `duracionMinutos`; definir duración de evento. |
| CA4 | El frontend arma días solo con fechas que tienen ítems; los días vacíos desaparecen. | Incluir todos los días del rango del circuito, aunque tengan `items: []`. Definir si el rango es `max(hoy, inicio)..fin` o todo el viaje. |

**Conclusión:** falta contrato de respuesta y falta la ruta de UI para consultar un circuito guardado desde “Mis viajes”.

---

## VZ-28 — Reemplazar propuesta turística

| CA | Problema | Propuesta |
| --- | --- | --- |
| CA1 | No hay `itemId` ni endpoints. No está claro sobre qué alternativa se opera. | Exponer `itemId`; definir endpoints de alternativas y reemplazo; decidir si se edita solo la alternativa seleccionada. |
| CA2 | “Bloque horario del ítem reemplazado” es ambiguo. No dice si el traslado cuenta, si vale cualquier tipo, ni si aplica radio/zona. | Definir: alternativa del mismo día, con `inicio >= original.inicio` y `fin <= original.fin`, sin solaparse, con traslado compatible, categoría dentro de intereses y propuesta disponible. |
| CA3 | “Ya estén en el circuito” no aclara alcance. | Excluir todos los ítems de la alternativa editada más el ítem reemplazado. |
| CA4 | “El resto permanece sin cambios” choca con recalcular el traslado del ítem siguiente y las métricas. | Definir que se conservan ítems, fechas y órdenes, pero se recalculan traslados adyacentes y métricas. |
| CA5 | Cancelar es 100% UI. | No llamar a la API al cancelar; documentarlo. |
| CA6 | No hay contrato para “no hay alternativas”. | `200` con `alternativas: []` y mensaje; si se intenta reemplazar por una inválida, `409/422` y el ítem original queda intacto. |

**Conclusión:** es la historia menos definida. Necesita contrato de endpoints, identidad de ítem y semántica exacta del bloque horario.

---

## VZ-29 — Eliminar propuesta turística

| CA | Problema | Propuesta |
| --- | --- | --- |
| CA1 | Misma falta de `itemId`, endpoints y ownership. | Reutilizar la identidad y validaciones de VZ-28. |
| CA2 | No se define si la confirmación es UI o backend. | Mantener el precedente de VZ-23: confirmación en UI; backend expone `DELETE`. |
| CA3 | Correcto, pero depende de invalidar caché y de que la consulta no devuelva el ítem. | Invalidar consulta de viaje/circuito después del delete. |
| CA4 | Hay que representar el día vacío y no borrar el circuito. | `GET` debe devolver `200` con el día en `items: []`; el circuito vacío se conserva. |
| CA5 | “Recalcular numeración y recorrido” no dice si se renumera `orden`, se recalcula el traslado siguiente, `distanciaTotalKm`, afinidad y categorías. | Renumerar por día; recalcular traslado del siguiente ítem, distancia total, afinidad y categorías cubiertas. |

---

## Contradicciones que hay que resolver sí o sí

1. **Tres alternativas vs un circuito único.** VZ-26/28/29 hablan de “el circuito” en singular; el código actual trabaja con 3 alternativas y una selección. Es la decisión más importante.
2. **Autenticación.** Sin login real o interino no se pueden cumplir los 401/403.
3. **Provincia vs radio.** CA3 pide “Provincia de Córdoba”; el código actual filtra por radio. Si se mantienen ambos, el radio puede violar CA3.
4. **Intereses estrictos vs estrategias.** CA4 exige correspondencia; el motor actual usa intereses como prioridad, no como filtro.
5. **Circuito vacío.** VZ-25 CA6 prohíbe generarlo; VZ-29 CA4 permite que quede vacío después de eliminar. Son cosas distintas y hay que redactarlo así.
6. **“Resto sin cambios” vs mapa.** Reemplazar/eliminar obliga a recalcular traslados; “sin cambios” no puede ser literal.

---

## Contrato que propongo (sujeto a tus respuestas)

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/viajes/{id}/circuito` | Generar; si ya existe, `409` con `requiereConfirmacion`; con `?reemplazar=true`, reemplaza. |
| `GET` | `/api/viajes/{id}/circuito` | Circuito con `dias[]`, `items[]`, `desactualizado` y `motivos`. |
| `GET` | `/api/viajes/{id}/circuito/items/{itemId}/alternativas` | Alternativas para reemplazar. |
| `PUT` | `/api/viajes/{id}/circuito/items/{itemId}` | Reemplazar por `propuestaId`. |
| `DELETE` | `/api/viajes/{id}/circuito/items/{itemId}` | Eliminar ítem. |

Además: `CircuitoItemResponse` debe incluir `itemId`; `Circuito` debe guardar un snapshot de los parámetros de generación para detectar CA9.

---

Para cerrar la definición necesito que confirmes estas decisiones:

**Tool: question**

---

## Assistant

## Decisiones adoptadas

| Tema | Decisión |
| --- | --- |
| Autenticación | Se difiere. Para no romper el contrato, los endpoints de circuito reciben `usuario` y **simulan** 401/403. Queda documentado como deuda. |
| Modelo | Se mantienen las **3 alternativas + selección**. El circuito consultable/editable es la **alternativa seleccionada**. |
| Edición | Reemplazar y eliminar operan **solo sobre la alternativa seleccionada**. |
| Filtros | Intereses **estrictos** + radio. Provincia de Córdoba por **invariante** (todas las ubicaciones cargadas son de Córdoba). |
| Confirmación | **Mixta:** el backend responde `409` pidiendo confirmación y la UI reintenta con un flag. |
| Días | Se muestran **todos los días del viaje**, incluidos los pasados, con `items: []` cuando corresponda. |

---

# Definición corregida

## VZ-25 — Generar circuito

**Precondiciones y reglas**

- “Destino” = `Viaje.zonaInteres`; “preferencias” = `Viaje.interesesCategoria`.
- Datos obligatorios para generar: `fechaInicio`, `fechaFin`, `zonaInteres` con coordenadas, `rangoInteresKm > 0`, `ritmo` e `interesesCategoria` no vacío.
- Si falta algo: `422` con `datosFaltantes: []` y **no se genera nada**.
- Estados permitidos: borrador completo, `PLANIFICADO` y `EN_CURSO`. `FINALIZADO` y `CANCELADO` no pueden generar.
- Elegibilidad: propuesta no cancelada/finalizada, con ubicación y coordenadas, dentro del radio, con categoría **perteneciente a los intereses**, con al menos una franja válida dentro del rango de fechas. La provincia se asume Córdoba por invariante del modelo.

**CA corregidos**

- **CA1:** si el viaje cumple las precondiciones, se generan las 3 alternativas y se persisten.
- **CA2:** si falta cualquier dato obligatorio, se responde `422` indicando **todos** los faltantes.
- **CA3:** solo se consideran propuestas dentro de `[fechaInicio, fechaFin]` y dentro del radio del destino. La pertenencia a Córdoba es un invariante del dato, no un filtro adicional.
- **CA4:** todo candidato debe tener `categoria ∈ interesesCategoria`. Las estrategias solo ordenan dentro de ese conjunto; ya no pueden incluir propuestas fuera de interés como relleno.
- **CA5:** los ítems de un día no se solapan, respetan la disponibilidad y el tiempo estimado de traslado. Un evento sin horario usa 09:00–18:00.
- **CA6:** si no hay ningún candidato elegible, se responde `422` y **no se persiste** un circuito vacío.
- **CA7:** las alternativas generadas quedan persistidas y se pueden consultar sin regenerar. La consulta del circuito seleccionado requiere que el usuario elija una alternativa.
- **CA8:** si ya existe circuito, `POST /circuito` sin `?reemplazar=true` responde `409` con “requiere confirmación”. Con `?reemplazar=true`, reemplaza las alternativas; si había una estrategia seleccionada, se intenta conservarla en el nuevo circuito. Si el usuario cancela, no se modifica nada.
- **CA9:** al generar se guarda un snapshot de fechas, zona, radio, ritmo e intereses. Al consultar el viaje/circuito se expone `desactualizado` y `motivosDesactualizacion` (`FECHAS`, `PREFERENCIAS`, `ZONA`, `RITMO`). No se regenera automáticamente; se ofrece regenerar.

---

## VZ-26 — Consultar circuito

**Endpoint**

`GET /api/viajes/{id}/circuito/seleccionado?usuario=...`

**Errores**

| Caso | Respuesta |
| --- | --- |
| Falta `usuario` | `401` (provisional, simulado) |
| Viaje inexistente | `404` |
| Viaje de otro usuario | `403` |
| Sin circuito o sin alternativa seleccionada | `404` |

**CA corregidos**

- **CA1:** se valida en orden `401 → 404 viaje → 403 dueño → 404 circuito/selección`.
- **CA2:** la respuesta agrupa por día en `dias[]`. Los días van ordenados por fecha y los ítems por `horaInicio` ascendente, con `orden` como desempate.
- **CA3:** cada ítem incluye `itemId`, nombre, tipo (`EVENTO`/`ACTIVIDAD`), categoría, ubicación, `horaInicio`, `horaFin` y `duracionMinutos`.
- **CA4:** se incluyen todos los días de `[fechaInicio, fechaFin]`. Un día sin ítems aparece con `items: []` y el frontend muestra “sin actividades programadas”.

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

---

## VZ-28 — Reemplazar propuesta

**Endpoints**

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/viajes/{id}/circuito/seleccionado/items/{itemId}/alternativas?usuario=...` | Lista alternativas válidas |
| `PUT` | `/api/viajes/{id}/circuito/seleccionado/items/{itemId}?usuario=...` | Reemplaza por `{ "propuestaId": 123 }` |

**Reglas de alternativa**

- Misma `fecha` que el ítem reemplazado.
- Intervalo completo dentro del bloque original: `inicio >= original.inicio` y `fin <= original.fin`.
- Sin solaparse con otros ítems del día.
- Categoría dentro de `interesesCategoria` y distancia dentro del radio.
- Propuesta activa y con disponibilidad válida.
- No incluir propuestas ya presentes en la alternativa seleccionada ni el ítem reemplazado.
- Verificar traslado desde el ítem anterior y hacia el siguiente. Si no hay alternativas, se informa y el ítem original queda intacto.

**CA corregidos**

- **CA1:** `401` sin usuario, `403` si el viaje es ajeno, `404` si el viaje/circuito/ítem no existe.
- **CA2:** se aplican las reglas anteriores; “bloque horario” significa que la alternativa entra completa en el intervalo original.
- **CA3:** se excluyen todos los ítems de la alternativa seleccionada y el ítem reemplazado.
- **CA4:** al confirmar se reemplaza solo ese ítem. Se conservan fechas, órdenes y el resto de los ítems; se recalculan el traslado del ítem reemplazado y del siguiente, y las métricas del circuito. Esa es la única excepción a “resto sin cambios”.
- **CA5:** cancelar es solo UI; no se llama a la API.
- **CA6:** si no hay alternativas, `200` con `alternativas: []` y mensaje. Si se intenta reemplazar por una propuesta inválida, `409/422` y el ítem original no cambia.

---

## VZ-29 — Eliminar propuesta

**Endpoint**

`DELETE /api/viajes/{id}/circuito/seleccionado/items/{itemId}?usuario=...&confirmar=true`

**CA corregidos**

- **CA1:** `401` sin usuario, `403` si el viaje es ajeno, `404` si el viaje/circuito/ítem no existe.
- **CA2:** sin `confirmar=true`, responde `409` indicando que requiere confirmación. La UI muestra el diálogo y reintenta con el flag. Sin confirmación, el ítem se conserva.
- **CA3:** tras eliminar, el ítem no aparece en la consulta ni en el mapa; se invalida la caché del viaje/circuito.
- **CA4:** si el día queda vacío, se devuelve igual con `items: []`. El circuito no se elimina aunque quede sin ítems.
- **CA5:** se renumera `orden` por día, se recalcula el traslado del ítem siguiente, y se recalculan `distanciaTotalKm`, `afinidadIntereses` y `categoriasCubiertas`. La respuesta devuelve el circuito actualizado.


---

## Límites que quedan documentados

- **Sin autenticación real:** 401/403 se simulan con `usuario`. Es una solución provisional, no seguridad real.
- **Provincia por invariante:** no hay filtro geográfico de provincia; se asume que todas las ubicaciones cargadas son de Córdoba.
- **“Resto sin cambios” no es literal:** reemplazar/eliminar recalcula traslados y métricas para que el mapa siga siendo coherente.
- **Duración de eventos:** se usa el bloque `horaInicio–horaFin`; no existe un campo de duración propia del evento.
- **Días pasados:** se muestran vacíos porque la generación planifica desde `max(hoy, fechaInicio)`.
- **Regenerar descarta ediciones manuales** de reemplazos/eliminaciones previas.

Con esto, las historias quedan definidas de forma implementable. Si estás de acuerdo con esta definición, el siguiente paso es ejecutar la Fase 1 y 2 del plan.

---

