# Pruebas manuales de la API — Sprint 3

> **Estado:** vigente para el Sprint 3.
> **Alcance:** verificación manual de los endpoints HTTP, sin frontend y sin tests automatizados.
> **Documentos relacionados:** [`API-PROPUESTAS-FRONTEND.md`](./API-PROPUESTAS-FRONTEND.md),
> [`CAMBIOS-Y-DECISIONES-SPRINT-3.md`](./CAMBIOS-Y-DECISIONES-SPRINT-3.md) y
> [`OPENSTREETMAP.md`](./OPENSTREETMAP.md).
>
> La guía vieja [`PRUEBAS-MANUALES.md`](../turismo-backend/PRUEBAS-MANUALES.md) corresponde a los
> Sprints 1 y 2 y quedó desactualizada. No toma en cuenta `Actividad`, `/api/propuestas` ni el seed
> actual.

## 1. Qué se puede verificar

Esta guía sirve para comprobar, contra una aplicación real:

- que el seed carga los datos esperados;
- que el listado unificado devuelve eventos y actividades con la forma correcta;
- que los filtros, el orden y la paginación funcionan;
- que el alta, la edición y el borrado persisten;
- que los errores devuelven el código y el formato esperados;
- que la geocodificación con Nominatim funciona en un alta real.

No sirve para verificar:

- la integración con el frontend, porque todavía no está conectado;
- el `409` de bloqueo optimista por HTTP, porque las respuestas no exponen `version`;
- autenticación o autorización, porque el backend todavía no tiene seguridad.

## 2. Requisitos

- JDK 17 o superior.
- Usar el wrapper de Maven incluido; no hace falta instalar Maven.
- Puerto `8080` libre.
- Conexión a internet para las altas: el backend geocodifica con Nominatim.
- `curl.exe` para la guía base, o Postman si preferís una interfaz gráfica.

## 3. Levantar la aplicación

En PowerShell:

```powershell
cd "C:\Users\gabri\OneDrive\Desktop\sprint3\Seminario-Integrador-Viajesazo\turismo-backend"
.\mvnw.cmd spring-boot:run
```

Esperar hasta ver en el log:

```text
Started TurismoBackendApplication
```

La aplicación queda escuchando en `http://localhost:8080`. Si la consola sigue escribiendo sentencias
SQL, es normal: `logging.level.org.hibernate.SQL=DEBUG` está habilitado en desarrollo.

Para detenerla: `Ctrl + C` en esa terminal.

### Comprobar que el puerto está libre

Si el arranque falla porque el puerto está ocupado:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID>
```

### Nota sobre PowerShell y los acentos

Usar siempre `curl.exe`, no `curl` ni `Invoke-RestMethod`. En PowerShell 5.1 esas variantes
decodifican la respuesta como ISO-8859-1 y muestran `CosquA?n` aunque el servidor esté enviando bien
el texto. Un `?` en la consola no significa que el dato esté mal guardado.

Si necesitás comprobar el texto con precisión:

```powershell
curl.exe -s -o target\respuesta.json "http://localhost:8080/api/eventos/1"
[System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes("target\respuesta.json"))
```

## 4. Datos del seed

Cada arranque recrea el esquema H2 y ejecuta `data.sql`. Los datos no sobreviven a un reinicio.
Con el seed actual se esperan:

| Recurso | Cantidad |
|---|---:|
| Propuestas totales | 10 |
| Eventos | 8 |
| Actividades | 2 |
| Publicadores | 3 |
| Viajes | 5 |

Los publicadores del seed tienen IDs 1, 2 y 3. El publicador 1 es `Turismo Córdoba`, con email
`info@cordoba.gob.ar`.

La agenda semanal usa fechas relativas para no quedar vacía, así que su cantidad puede variar
según el día en que se ejecute la prueba.

## 5. Verificación inicial del seed

Ejecutar:

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?size=100"
curl.exe -s -i "http://localhost:8080/api/eventos?size=100"
curl.exe -s -i "http://localhost:8080/api/actividades?size=100"
curl.exe -s -i "http://localhost:8080/api/publicadores?size=10"
curl.exe -s -i "http://localhost:8080/api/viajes?usuario=turista.demo@viajesazo.com"
curl.exe -s -i "http://localhost:8080/api/agenda?fechaDesde=2020-01-01&size=100"
curl.exe -s -i "http://localhost:8080/api/agenda/semanal"
curl.exe -s -i "http://localhost:8080/api/eventos/1"
```

Resultados esperados:

| Request | Resultado esperado |
|---|---|
| `GET /api/propuestas?size=100` | `200`; `page.totalElements = 10`; 8 ítems `EVENTO` y 2 `ACTIVIDAD` |
| `GET /api/eventos?size=100` | `200`; `page.totalElements = 8` |
| `GET /api/actividades?size=100` | `200`; `page.totalElements = 2` |
| `GET /api/publicadores?size=10` | `200`; 3 publicadores |
| `GET /api/viajes?usuario=turista.demo@viajesazo.com` | `200`; 2 viajes |
| `GET /api/agenda?fechaDesde=2020-01-01&size=100` | `200`; solo eventos, ordenados por fecha; sin `CANCELADO` |
| `GET /api/agenda/semanal` | `200`; contenido coherente con la semana actual |
| `GET /api/eventos/1` | `200`; `tipo = "EVENTO"` y nombre `Cosquín Rock` |

En `/api/propuestas` verificar además:

- que cada ítem tenga `tipo` (`EVENTO` o `ACTIVIDAD`);
- que los campos exclusivos del otro subtipo vengan `null`;
- que `publicadorNombre` no sea `null`;
- que `imagenes` sea una lista.

## 6. Búsqueda, filtros y orden

### 6.1 Filtro por tipo

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?tipo=EVENTO"
curl.exe -s -i "http://localhost:8080/api/propuestas?tipo=ACTIVIDAD"
```

Esperado: `200` y todos los ítems del tipo pedido.

### 6.2 Búsqueda por texto

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?q=rock"
```

Esperado: `200` y al menos el evento `Cosquín Rock`.

### 6.3 Filtro por localidad

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?tipo=ACTIVIDAD&localidad=Villa%20Carlos%20Paz"
```

Esperado: `200` y la actividad `Senderismo en el Cerro de la Cruz`.

### 6.4 Orden por campos de evento

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?tipo=EVENTO&sort=fechaInicio,asc"
```

Esperado: `200`, ordenado por `fechaInicio` ascendente.

### 6.5 Orden por campos de actividad

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?tipo=ACTIVIDAD&sort=duracionMinutos,desc"
```

Esperado: `200`, con `180` minutos antes que `90`.

### 6.6 Paginación

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?size=2&page=0"
```

Esperado: `200`, `page.size = 2`, `page.number = 0` y como máximo 2 ítems en `content`.

### 6.7 Tope de tamaño de página

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?size=100000"
```

Esperado: `200` y `page.size = 100`, no `100000`.

### 6.8 Casos inválidos

```powershell
curl.exe -s -i "http://localhost:8080/api/propuestas?sort=inventado"
curl.exe -s -i "http://localhost:8080/api/propuestas?fechaDesde=2027-01-01"
curl.exe -s -i "http://localhost:8080/api/propuestas?sort=fechaInicio,asc"
```

Los tres deben devolver `400`:

- `sort=inventado`: campo fuera de la lista permitida.
- `fechaDesde` sin `tipo=EVENTO`: el filtro de fechas solo aplica a eventos.
- `sort=fechaInicio` sin `tipo=EVENTO`: el orden por fecha solo aplica a eventos.

### 6.9 Agenda turística VZ-18

Usar un `fechaDesde` viejo para no depender del día en que se corre la prueba (el default es hoy):

```powershell
curl.exe -s -i "http://localhost:8080/api/agenda?fechaDesde=2020-01-01&size=100"
curl.exe -s -i "http://localhost:8080/api/agenda?fechaDesde=2020-01-01&tipoPropuesta=FESTIVAL"
curl.exe -s -i "http://localhost:8080/api/agenda?fechaDesde=2020-01-01&categoria=CULTURA&tipoAcceso=DE_PAGO"
curl.exe -s -i "http://localhost:8080/api/agenda?fechaDesde=2020-01-01&ubicacion=cosquin"
curl.exe -s -i "http://localhost:8080/api/agenda?fechaDesde=2020-01-01&fechaHasta=2020-12-31"
curl.exe -s -i "http://localhost:8080/api/agenda?categoria=NO_EXISTE"
```

Esperado:

- `200` con `content` de `PropuestaResumenResponse`, **solo** ítems con `tipo = "EVENTO"`.
- Ordenados por `fechaInicio` y luego `horarioInicio` ascendente, aunque se mande `sort=nombre,asc`
  (el orden es fijo y ese parámetro se ignora).
- Ningún ítem con `estadoPropuesta.nombre = "CANCELADO"`.
- `ubicacion=cosquin` encuentra eventos de `Cosquín` sin importar mayúsculas ni tildes; también
  busca en `lugarRecinto` y `direccion`.
- `fechaHasta=2020-12-31` devuelve `content: []` y `200` (no es un error).
- `categoria=NO_EXISTE` devuelve `400`.

El detalle de cualquier ítem se consulta con `GET /api/eventos/{id}` (CA3).

## 7. Consultar un detalle

Evento del seed:

```powershell
curl.exe -s -i "http://localhost:8080/api/eventos/1"
```

Actividad: obtener primero un ID del listado y usarlo:

```powershell
curl.exe -s -i "http://localhost:8080/api/actividades?size=10"
curl.exe -s -i "http://localhost:8080/api/actividades/EL_ID"
```

Esperado: `200`, `tipo = "ACTIVIDAD"` y la lista `disponibilidades`.

No hardcodear el ID de las actividades: los IDs de eventos del seed son estables, pero es mejor
obtener el de la actividad desde el listado.

## 8. Crear un evento

Las altas requieren conexión a internet porque el backend llama a Nominatim para resolver la
ubicación.

### 8.1 Alta válida

```powershell
curl.exe -s -i -X POST "http://localhost:8080/api/eventos" `
  -H "Content-Type: application/json" `
  --data-raw "{\"nombre\":\"Prueba manual evento\",\"descripcion\":\"Prueba de alta\",\"tipoPropuesta\":\"FERIA\",\"tipoAcceso\":\"GRATUITO\",\"lugarRecinto\":\"Cerro de la Cruz\",\"localidad\":\"Villa Carlos Paz\",\"direccion\":\"Cerro de la Cruz\",\"fechaInicio\":\"2027-03-01\",\"fechaFin\":\"2027-03-02\",\"publicadorId\":1}"
```

Esperado:

- status `201`;
- body con `id`;
- `tipo = "EVENTO"`;
- `estadoPropuesta = "INICIADO"`;
- `latitud` y `longitud` no nulas;
- `publicadorId = 1`;
- `publicadorNombre = "Turismo Córdoba"`.

Este controller no devuelve header `Location`; el ID está en el body.

Guardar el ID y consultarlo:

```powershell
curl.exe -s -i "http://localhost:8080/api/eventos/EL_ID"
```

Esperado: `200` y el mismo evento.

### 8.2 Falta el nombre

```powershell
curl.exe -s -i -X POST "http://localhost:8080/api/eventos" `
  -H "Content-Type: application/json" `
  --data-raw "{\"descripcion\":\"Sin nombre\",\"tipoPropuesta\":\"FERIA\",\"tipoAcceso\":\"GRATUITO\",\"lugarRecinto\":\"Cerro de la Cruz\",\"localidad\":\"Villa Carlos Paz\",\"direccion\":\"Cerro de la Cruz\",\"fechaInicio\":\"2027-03-01\",\"fechaFin\":\"2027-03-02\",\"publicadorId\":1}"
```

Esperado: `400`, error de validación de Bean Validation.

### 8.3 Falta el tipo de propuesta

```powershell
curl.exe -s -i -X POST "http://localhost:8080/api/eventos" `
  -H "Content-Type: application/json" `
  --data-raw "{\"nombre\":\"Prueba sin tipo\",\"tipoAcceso\":\"GRATUITO\",\"lugarRecinto\":\"Cerro de la Cruz\",\"localidad\":\"Villa Carlos Paz\",\"direccion\":\"Cerro de la Cruz\",\"fechaInicio\":\"2027-03-01\",\"fechaFin\":\"2027-03-02\",\"publicadorId\":1}"
```

Esperado: `422` con `Content-Type: application/problem+json` y `detail` indicando que el tipo de
propuesta es obligatorio.

### 8.4 Evento arancelado sin monto

```powershell
curl.exe -s -i -X POST "http://localhost:8080/api/eventos" `
  -H "Content-Type: application/json" `
  --data-raw "{\"nombre\":\"Prueba arancelada\",\"tipoPropuesta\":\"FERIA\",\"tipoAcceso\":\"DE_PAGO\",\"lugarRecinto\":\"Cerro de la Cruz\",\"localidad\":\"Villa Carlos Paz\",\"direccion\":\"Cerro de la Cruz\",\"fechaInicio\":\"2027-03-01\",\"fechaFin\":\"2027-03-02\",\"publicadorId\":1}"
```

Esperado: `422`; para `DE_PAGO` el monto y el sitio oficial son obligatorios.

> Importante: los errores de dominio se evalúan después de geocodificar. Si no hay internet o la
> dirección no existe, primero vas a recibir un `400` por geocodificación. Para probar los `422`,
> usá una dirección que Nominatim pueda resolver.

## 9. Crear una actividad

### 9.1 Alta válida

```powershell
curl.exe -s -i -X POST "http://localhost:8080/api/actividades" `
  -H "Content-Type: application/json" `
  --data-raw "{\"nombre\":\"Prueba manual actividad\",\"descripcion\":\"Prueba\",\"tipoPropuesta\":\"VISITA_GUIADA\",\"tipoAcceso\":\"GRATUITO\",\"lugarRecinto\":\"Cerro de la Cruz\",\"localidad\":\"Villa Carlos Paz\",\"direccion\":\"Cerro de la Cruz\",\"duracionMinutos\":90,\"disponibilidades\":[{\"diaSemana\":\"MONDAY\",\"horaInicio\":\"09:00:00\",\"horaFin\":\"11:00:00\"}],\"publicadorId\":1}"
```

Esperado:

- status `201`;
- body con `id`;
- `tipo = "ACTIVIDAD"`;
- `duracionMinutos = 90`;
- una disponibilidad con día `MONDAY`;
- `latitud` y `longitud` no nulas.

Guardar el ID y consultarlo:

```powershell
curl.exe -s -i "http://localhost:8080/api/actividades/EL_ID"
```

### 9.2 Duración inválida

Repetir el alta con `"duracionMinutos":0`.

Esperado: `400`, porque la duración debe ser mayor a cero.

### 9.3 Tipo de propuesta inválido para una actividad

Repetir el alta con `"tipoPropuesta":"FERIA"`.

Esperado: `422`; una actividad solo admite `VISITA_GUIADA` o `DEPORTIVO`.

### 9.4 Disponibilidad inválida

Repetir el alta con:

```json
"disponibilidades": [
  { "diaSemana": "MONDAY", "horaInicio": "11:00:00", "horaFin": "10:00:00" }
]
```

Esperado: `422`; la hora de fin debe ser posterior a la de inicio.

## 10. Actualizar

Para el evento creado, usar el mismo payload del alta cambiando el nombre y el método a `PUT`:

```powershell
curl.exe -s -i -X PUT "http://localhost:8080/api/eventos/EL_ID" `
  -H "Content-Type: application/json" `
  --data-raw "{\"nombre\":\"Prueba manual evento editado\",\"descripcion\":\"Prueba de edicion\",\"tipoPropuesta\":\"FERIA\",\"tipoAcceso\":\"GRATUITO\",\"lugarRecinto\":\"Cerro de la Cruz\",\"localidad\":\"Villa Carlos Paz\",\"direccion\":\"Cerro de la Cruz\",\"fechaInicio\":\"2027-03-01\",\"fechaFin\":\"2027-03-02\",\"publicadorId\":1}"
```

Esperado: `200` y el nombre actualizado.

Repetir el mismo procedimiento para la actividad:

```powershell
curl.exe -s -i -X PUT "http://localhost:8080/api/actividades/EL_ID" `
  -H "Content-Type: application/json" `
  --data-raw "{\"nombre\":\"Prueba manual actividad editada\",\"descripcion\":\"Prueba de edicion\",\"tipoPropuesta\":\"VISITA_GUIADA\",\"tipoAcceso\":\"GRATUITO\",\"lugarRecinto\":\"Cerro de la Cruz\",\"localidad\":\"Villa Carlos Paz\",\"direccion\":\"Cerro de la Cruz\",\"duracionMinutos\":120,\"disponibilidades\":[{\"diaSemana\":\"MONDAY\",\"horaInicio\":\"09:00:00\",\"horaFin\":\"11:00:00\"}],\"publicadorId\":1}"
```

Esperado: `200`, `duracionMinutos = 120` y el nombre actualizado.

## 11. Borrar y verificar el 404

Borrar solamente los registros creados durante la prueba:

```powershell
curl.exe -s -i -X DELETE "http://localhost:8080/api/eventos/EL_ID"
curl.exe -s -i -X DELETE "http://localhost:8080/api/actividades/EL_ID"
```

Esperado: `204` en ambos casos.

Verificar que ya no existen:

```powershell
curl.exe -s -i "http://localhost:8080/api/eventos/EL_ID"
curl.exe -s -i "http://localhost:8080/api/actividades/EL_ID"
```

Esperado: `404`.

También se puede verificar un ID inexistente:

```powershell
curl.exe -s -i "http://localhost:8080/api/eventos/999999"
```

Esperado: `404`.

## 12. Resumen de errores esperados

| Caso | Status |
|---|---:|
| Falta `nombre` | `400` |
| `duracionMinutos` menor o igual a cero | `400` |
| Enum inválido en el JSON | `400` |
| Sort fuera de la lista permitida | `400` |
| Filtro de fecha sin `tipo=EVENTO` | `400` |
| Orden por fecha sin `tipo=EVENTO` | `400` |
| Falta `tipoPropuesta` | `422` |
| Tipo incompatible con el subtipo | `422` |
| Evento `DE_PAGO` sin monto o sitio | `422` |
| Disponibilidad con fin anterior al inicio | `422` |
| ID inexistente | `404` |
| Edición de propuesta finalizada o cancelada | `400` |

Los `422` usan `ProblemDetail` y `Content-Type: application/problem+json`. Los `400` de validación
usan el formato de error legacy del proyecto.

## 13. Checklist de verificación

- [ ] La app arranca y muestra `Started TurismoBackendApplication`.
- [ ] `/api/propuestas` devuelve 10 propuestas: 8 eventos y 2 actividades.
- [ ] `/api/eventos` devuelve 8.
- [ ] `/api/actividades` devuelve 2.
- [ ] `/api/publicadores` devuelve 3.
- [ ] `/api/viajes?usuario=...` devuelve 2.
- [ ] `/api/agenda/semanal` devuelve `200`.
- [ ] `/api/agenda?fechaDesde=2020-01-01` devuelve solo eventos, ordenados y sin `CANCELADO`.
- [ ] `ubicacion=cosquin` encuentra eventos de `Cosquín` sin importar tildes.
- [ ] El detalle de un ítem de la agenda se obtiene con `/api/eventos/{id}`.
- [ ] Los filtros por tipo, texto y localidad funcionan.
- [ ] El orden por fecha funciona con `tipo=EVENTO`.
- [ ] El orden por duración funciona con `tipo=ACTIVIDAD`.
- [ ] La paginación respeta `page` y `size`.
- [ ] `size=100000` se limita a 100.
- [ ] Se crea un evento con `201` y coordenadas.
- [ ] Se crea una actividad con `201` y disponibilidades.
- [ ] La edición devuelve `200` y persiste.
- [ ] El borrado devuelve `204`.
- [ ] El `GET` posterior al borrado devuelve `404`.
- [ ] Los errores `400` y `422` se diferencian correctamente.
- [ ] Al reiniciar la app, el seed vuelve a los valores iniciales.

## 14. Problemas frecuentes

### El alta devuelve 400 y menciona la ubicación

Nominatim no encontró la dirección o no hay conexión. Probar con una dirección más conocida y
verificar internet. La geocodificación tiene un límite aproximado de una request por segundo.

### El body JSON se rompe en PowerShell

Usar Postman o ejecutar `curl.exe` con las comillas escapadas como se muestra en esta guía. No usar
`Set-Content -Encoding UTF8` en PowerShell 5.1 para crear bodies: agrega BOM y puede romper el
parseo de Jackson.

### Los acentos se ven como `?` o `A?`

Es un problema de visualización de la consola, no del backend. Guardar la respuesta con
`curl.exe -o` y leerla como UTF-8.

### El `DELETE` de un evento del seed devuelve 400

Puede ser por el estado de la propuesta. Para las pruebas de borrado, usar los registros creados
durante la sesión, no los del seed.

### No se puede probar el 409

Las respuestas no exponen `version`, así que no se puede forzar un conflicto de bloqueo optimista
desde un `PUT` normal. Ese caso está cubierto por los tests, no por esta guía manual.

## 15. Postman

Si preferís Postman, crear un environment con:

| Variable | Valor |
|---|---|
| `baseUrl` | `http://localhost:8080` |
| `publicadorId` | `1` |

Usar los mismos requests y payloads de esta guía. Para cada alta, copiar el `id` de la respuesta y
guardarlo en una variable `eventoId` o `actividadId` para las consultas, actualizaciones y borrados.

No es necesario conectar el frontend para ejecutar estas pruebas: todas las verificaciones son
contra la API HTTP.
