# Pruebas manuales de la API

Guía para probar los endpoints a mano, sin tests automatizados. Todo lo que está acá está verificado
contra el código; los bordes marcados como "no cubierto" no los verifiqué y hay que probarlos a mano.

## 1. Requisitos

- JDK 17 o superior (en la máquina de desarrollo, 21).
- Maven **no**: se usa el wrapper `mvnw` / `mvnw.cmd`, que se descarga solo la primera vez.
- No hace falta nada externo: la base es H2 en memoria y el seed viene con el proyecto.

## 2. Levantar la aplicación

### Opción A — en primer plano (la recomendada para probar)

```powershell
.\mvnw.cmd spring-boot:run
```

Queda escribiendo en la consola. Para detenerla: `Ctrl + C`.

### Opción B — como jar, en segundo plano

```powershell
.\mvnw.cmd clean package
Start-Process java -ArgumentList "-jar","target\turismo-backend-0.0.1-SNAPSHOT.jar" `
  -RedirectStandardOutput "target\app.log" -RedirectStandardError "target\app.err" -WindowStyle Hidden
```

Esperar unos 6 segundos y confirmar que arrancó:

```powershell
Select-String -Path target\app.log -Pattern "Started TurismoBackendApplication"
```

**Para detenerla hay que matar el proceso**, porque sola queda escuchando en el 8080:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID> -ErrorAction SilentlyContinue
```

> Si la app queda levantada y te parece que "se colgó" la terminal, es solo eso: el proceso de Java
> sigue esperando requests. No es un test colgado.

Base: `http://localhost:8080`. Comprobación rápida de vida: `curl.exe -s http://localhost:8080/api/agenda/semanal`

## 3. Datos de arranque

Cada arranque borra y recrea el esquema (`ddl-auto=create-drop`) y corre `data.sql`, así que la
base arranca siempre con los mismos datos: **3 publicadores, 8 eventos (cada uno con una imagen),
5 ubicaciones y 5 viajes**.

**Los ids son siempre los mismos** (van por orden de inserción), lo cual hace predecibles los ejemplos:

| id | Publicador | email |
| --- | --- | --- |
| 1 | Turismo Córdoba | info@cordoba.gob.ar |
| 2 | Municipalidad de Cosquín | cosquin@cordoba.gob.ar |
| 3 | Asociación de Artesanos | artesanos@cordoba.gob.ar |

| id | Evento | Publicador | Fechas |
| --- | --- | --- | --- |
| 1 | Cosquín Rock | 1 | 2027-02-06 → 2027-02-07 |
| 2 | Festival Nacional de Folklore de Cosquín | 2 | 2026-01-24 → 2026-02-01 |
| 3 | Oktoberfest | 1 | 2026-10-02 → 2026-10-12 |
| 4 | Peperina | 3 | 2026-04-03 → 2026-04-05 |
| 5 | Fiesta de las Colectividades | 3 | 2026-02-04 → 2026-02-08 |
| 6 | Festival Nacional de Doma y Folklore de Jesús María | 2 | 2026-01-08 → 2026-01-18 |
| 7 | Festival Internacional de Peñas | 1 | 2026-02-06 → 2026-02-10 |
| 8 | Masa Vienesa | 1 | 2026-04-02 → 2026-04-05 |

Eventos por publicador: **1 → 4 eventos** (1, 3, 7, 8), **2 → 2** (2, 6), **3 → 2** (4, 5).

Ojo: los eventos del seed usan **fechas fijas** 2026/2027 y **no setean `categoria` ni horarios**
(esas columnas quedan en NULL). Por eso la agenda semanal (sección 8.1) solo trae eventos cuando
la fecha del ensayo cae dentro de alguno de esos rangos: hoy (2026-10-12) el único que entra es
**Oktoberfest** (termina hoy).

Los **viajes** sí usan fechas relativas a hoy, para que el demo siempre tenga viajes futuros. Las
ubicaciones se siembran antes porque `Viaje.zonaInteres` es una FK a `ubicacion`:

| id | Ubicación (ciudad) | Localidad | lat / long |
| --- | --- | --- | --- |
| 1 | Villa General Belgrano | Córdoba | -31.95 / -64.55 |
| 2 | Ciudad de Córdoba | Córdoba | -31.42 / -64.18 |
| 3 | Carlos Paz | Córdoba | -31.42 / -64.50 |
| 4 | Alta Gracia | Córdoba | -31.65 / -64.43 |
| 5 | La Cumbrecita | Córdoba | -31.90 / -64.77 |

| id | Viaje | zonaInteres | rango | ritmo | Fechas | usuario |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Escapada serrana por Villa General Belgrano | 1 | 35 | EQUILIBRADO | hoy+7 → hoy+9 | turista.demo@viajesazo.com |
| 2 | Cultura y naturaleza en Córdoba | 2 | 50 | TRANQUILO | hoy+14 → hoy+17 | turista.demo@viajesazo.com |
| 3 | Aventura en el Valle de Punilla | 3 | 45 | INTENSIVO | hoy+21 → hoy+24 | turista.aventura@viajesazo.com |
| 4 | Sabores y tradiciones de Córdoba | 4 | 30 | TRANQUILO | hoy+28 → hoy+30 | turista.gastronomico@viajesazo.com |
| 5 | Recorrido familiar por las sierras | 5 | 40 | EQUILIBRADO | hoy+35 → hoy+38 | familia.demo@viajesazo.com |

Todos nacen con `estado='PLANIFICADO'`. `turista.demo@viajesazo.com` es el único con dos viajes
(ids 1 y 2), cómodo para probar VZ-22. Los ids, igual que los eventos, son fijos.

## 4. El detalle de los acentos (leer antes que nada)

`Invoke-WebRequest` e `Invoke-RestMethod` de PowerShell **decodifican la respuesta como ISO-8859-1**
porque el `Content-Type` es `application/json` sin charset. El servidor manda bien los acentos, pero
la consola los muestra como `CosquA-n` o `Turismo CA3rdoba`. **No es un bug de la app** y no hay que
"arreglarlo" en el código.

Además, la consola de PowerShell no renderiza acentos: un `?` en la salida tampoco implica nada malo.

Para mirar los datos sin dudas, descargar y leer los bytes como UTF-8:

```powershell
curl.exe -s -o target\resp.json http://localhost:8080/api/eventos/1
[System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes("target\resp.json"))
```

Si la salida muestra `?` es la consola. Para estar 100 % seguro, comparar el hex:

```powershell
# bytes luego de "Cosqu" en la respuesta
0xC3 0xAD   = í correcta
0xC3 0x83 0xC2 0xAD   = doblemente codificada (bug de encoding del seed)
```

## 5. Enviar bodies JSON sin que se rompa el encoding

El camino más confiable en PowerShell es dejar el body en un archivo escrito en **UTF-8 sin BOM**.
El `-Encoding UTF8` de `Set-Content` en PowerShell 5.1 mete BOM, y el BOM rompe el parseo de Jackson.

```powershell
$json = '{ "nombre": "Prueba manual", "email": "prueba@cordoba.gob.ar" }'
[System.IO.File]::WriteAllText("target\body.json", $json, (New-Object System.Text.UTF8Encoding($false)))

curl.exe -s -X POST http://localhost:8080/api/publicadores `
  -H "Content-Type: application/json" `
  --data-binary "@target\body.json"
```

En Linux/macOS alcanza con un heredoc:

```bash
curl -s -X POST http://localhost:8080/api/publicadores \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Prueba manual","email":"prueba@cordoba.gob.ar"}'
```

## 6. Paginación

Los listados (`/api/eventos`, `/api/publicadores`, `/api/publicadores/{id}/eventos`,
`/api/agenda/semanal` y `/api/viajes`) aceptan:

| Parámetro | Default | Tope |
| --- | --- | --- |
| `?page=` | 0 | — |
| `?size=` | 20 | 100 |

El tope viene de `spring.data.web.pageable.max-page-size`. Un `?size=100000` **no** rompe la app:
se recorta a 100.

La forma de la respuesta es esta (`content` + metadatos anidados bajo `page`):

```json
{
  "content": [ { "id": 1, "nombre": "Festival de Folklore", "...": "..." } ],
  "page": { "size": 20, "number": 0, "totalElements": 4, "totalPages": 1 }
}
```

Un publicador **sin** eventos devuelve `content: []` con **200**, no un 404.

## 7. Formato del cuerpo de error

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "No existe el evento con id 999",
  "timestamp": "2026-09-27T00:30:56.0241761"
}
```

Los cuatro campos van en inglés, pero el **valor** de `message` es texto en español. Es el único
lugar de la API que no sigue el español de los DTO.

Para ver el status HTTP de un error hay que mirar la respuesta completa, no solo el cuerpo:

```powershell
try {
  Invoke-WebRequest http://localhost:8080/api/eventos/999 -UseBasicParsing
} catch {
  $r = $_.Exception.Response
  "HTTP $([int]$r.StatusCode)"
}
```

## 8. Los endpoints, uno por uno

### 8.1 `GET /api/agenda/semanal` — US6

Agenda de la semana ISO, de **hoy hasta el domingo** (límite inferior hoy, no el lunes), paginada.

```powershell
curl.exe -s "http://localhost:8080/api/agenda/semanal?page=0&size=20"
```

Qué esperar: solo entran los eventos que **se solapan** con la ventana hoy→domingo. Como el seed de
eventos usa **fechas fijas** 2026/2027 (ver sección 3), la agenda suele venir casi vacía:

- Hoy (2026-10-12) el único evento que solapa es Oktoberfest (termina hoy) → `totalElements: 1`.
- En general, mientras el seed siga con fechas fijas, la agenda suele estar vacía: es esperado, no
  un bug. Para que tenga contenido, sembrar los eventos con fechas relativas.
- Un evento que empezó antes de hoy y sigue vigente **también entra**: es solapamiento, no igualdad.

Variante para ver la paginación:

```powershell
curl.exe -s "http://localhost:8080/api/agenda/semanal?page=0&size=1"
```

### 8.2 `GET /api/publicadores/{id}/eventos` — US5

Eventos de un publicador, ordenados por fecha de inicio (el orden lo impone el servidor).

```powershell
curl.exe -s "http://localhost:8080/api/publicadores/1/eventos?page=0&size=2"
```

Qué esperar: `totalElements: 4` para el publicador 1. Con `size=2` → `totalPages: 2`.

- Publicador 2 → 2 eventos. Publicador 3 → 2 eventos.
- Publicador **999** → 404 con `"No existe el publicador con id 999"`.

### 8.3 `GET /api/eventos/{id}` — US4

```powershell
curl.exe -s http://localhost:8080/api/eventos/1
```

Qué esperar: el evento 1 con sus 2 imágenes y `publicadorId: 1`, `publicadorNombre: "Turismo Córdoba"`.
Ojo: `publicadorId` y `publicadorNombre` vienen **aplanados** en el response (en la entidad el origen
es `publicador.id` / `publicador.nombre`).

- `GET /api/eventos/999` → 404 con `"No existe el evento con id 999"`.

### 8.4 `GET /api/publicadores/{id}` — soporte

```powershell
curl.exe -s http://localhost:8080/api/publicadores/1
```

- `/api/publicadores/999` → 404 con `"No existe el publicador con id 999"`.

### 8.5 `POST /api/publicadores` — soporte

```json
{ "nombre": "Prueba manual", "email": "prueba@cordoba.gob.ar", "telefono": "0351-0000000" }
```

Qué esperar: **201** y el body con el `id` asignado (4, si es el primero nuevo del arranque).

Casos de error, todos **400** con el detalle en `message`:

| Body | `message` esperado |
| --- | --- |
| `{"nombre":"","email":"a@b.com"}` | `nombre: el nombre es obligatorio` |
| `{"nombre":"X"}` | `email: el email es obligatorio` |
| `{"nombre":"X","email":"esto-no-es-un-email"}` | `email: el email no tiene un formato válido` |

El email es único. Mandarlo dos veces da **400** con
`ya existe un publicador con ese email`: lo detecta `PublicadorRepository.existsByEmail` antes de
insertar. El `message` es un **string plano**, no una lista de errores por campo, así que no se
puede parsear: el frontend lo muestra tal cual (ver sección 9).

### 8.6 `POST /api/eventos` — US1

```json
{
  "nombre": "Festival de prueba",
  "descripcion": "Evento creado a mano",
  "categoria": "CULTURA",
  "localidad": "Cosquín",
  "direccion": "Plaza Pringles",
  "fechaInicio": "2026-10-01",
  "fechaFin": "2026-10-03",
  "horarioInicio": "20:00:00",
  "horarioFin": "23:30:00",
  "imagenes": ["https://cdn.cordoba.gob.ar/prueba.jpg"],
  "publicadorId": 1
}
```

Qué esperar: **201** y el evento creado con su `id`.

Solo son obligatorios `nombre`, `fechaInicio`, `fechaFin` y `publicadorId`. El resto puede venir
`null` o ausente; sin `imagenes` se guarda con lista vacía, no con `null`.

`categoria` acepta exactamente: `NATURALEZA`, `GASTRONOMIA`, `CULTURA`, `HISTORIA`, `AVENTURA`,
`VIDA_NOCTURNA`, `MUSICA`, `COMPRAS`, `FAMILIAR_Y_RELAX` (en mayúsculas; es como se persiste).
**Cualquier otro valor da 400, no 500.**

Casos de error, **medidos contra la app corriendo** (no deducidos del código):

| Body | Status | `message` |
| --- | --- | --- |
| sin `nombre` o `nombre: ""` | 400 | `nombre: el nombre es obligatorio` |
| sin `fechaInicio` o `fechaInicio: ""` | 400 | `fechaInicio: la fecha de inicio es obligatoria` |
| sin `fechaFin` | 400 | `fechaFin: la fecha de finalización es obligatoria` |
| sin `publicadorId` | 400 | `publicadorId: el publicador es obligatorio` |
| `"fechaInicio": "no-es-fecha"` | 400 | `el cuerpo de la petición no es válido o tiene un formato incorrecto` |
| `"categoria": "NO_EXISTE"` | 400 | `el cuerpo de la petición no es válido o tiene un formato incorrecto` |
| `"imagenes": [""]` | 400 | `imagenes[0]: las URLs de imagen no pueden estar vacías` |
| `fechaFin` anterior a `fechaInicio` | 400 | `la fecha de finalización no puede ser anterior a la de inicio` |
| `horarioFin` anterior a `horarioInicio` | 400 | `el horario de finalización debe ser posterior al de inicio` |
| `publicadorId: 999` | 404 | `No existe el publicador con id 999` |

Dos comportamientos que sorprenden y conviene tener a mano:

- **`""` en un `LocalDate` o `LocalTime` NO da error de parseo.** Jackson lo coerciona a `null`.
  En `horarioInicio` (que no tiene `@NotNull`) el alta se guarda con **201** y el horario queda
  vacío; en `fechaInicio` lo agarra el `@NotBlank` y sale el 400 de campo de la tabla. El 400
  genérico de Jackson es para formatos **malformados** de verdad, no para cadenas vacías.
- **`"imagenes": [""]` sí dispara** el `@NotBlank` del elemento, y el mensaje incluye el índice
  (`imagenes[0]`). Por eso el formulario frena la fila en blanco antes de enviar.

### 8.7 `PUT /api/eventos/{id}` — US2

Mismo body que el POST.

```powershell
curl.exe -s -X PUT http://localhost:8080/api/eventos/1 `
  -H "Content-Type: application/json" --data-binary "@target\body.json"
```

Qué esperar: **200** con el evento ya modificado. Mismas validaciones que el alta.

Ojo con el `update`: si el body **no** trae `imagenes`, se conserva la lista que ya tenía (no se
borra), porque el mapper ignora los `null`. Para dejarla vacía hay que mandar `"imagenes": []`.

- `PUT /api/eventos/999` → 404.

### 8.8 `DELETE /api/eventos/{id}` — US3

```powershell
curl.exe -s -i -X DELETE http://localhost:8080/api/eventos/7
```

Qué esperar: **204** y **cuerpo vacío**. La baja es **física**: el evento desaparece de la base y no
vuelve al reiniciar.

- `DELETE /api/eventos/999` → 404.

### 8.9 `GET /api/eventos` — US7

Listado completo de eventos, paginado. **No aplica ninguna ventana de fechas**: a diferencia de la
agenda, trae también los eventos que ya terminaron y los que todavía no empiezan.

```powershell
curl.exe -s "http://localhost:8080/api/eventos?page=0&size=20"
```

Qué esperar: los 8 eventos del seed con `totalElements: 8`, `totalPages: 1`. Orden por fecha de
inicio y, dentro del mismo día, por hora de inicio (el orden lo impone el servidor), así que el
primero es el Festival de Doma y Folklore (2026-01-08), no el id 1.

- `?size=3` → `totalPages: 3` (8 eventos).
- Sin eventos cargados → página vacía con **200**, no 404.

### 8.10 `GET /api/publicadores` — US7

Listado completo de publicadores, paginado, en **orden alfabético por nombre**.

```powershell
curl.exe -s "http://localhost:8080/api/publicadores?page=0&size=20"
```

Qué esperar: los 3 publicadores del seed, ordenados así (que no es el orden de inserción: el seed
inserta Turismo Córdoba primero):

1. Asociación de Artesanos (id 3)
2. Municipalidad de Cosquín (id 2)
3. Turismo Córdoba (id 1)

- Sin publicadores cargados → página vacía con **200**, no 404.

## 8 bis. Viajes (Sprint 2: VZ-19 / VZ-21 / VZ-22 / VZ-23)

Base `/api/viajes`. La API expone fechas como `LocalDate` (`"2026-11-01"`) aunque la entidad guarde
`LocalDateTime`. Recordar que la baja es **lógica** (ver 8.20).

### 8.17 `GET /api/viajes?usuario=` — VZ-22

Listado de viajes **activos** (no cancelados) de un turista, paginado. `usuario` es **obligatorio**.

```powershell
curl.exe -s "http://localhost:8080/api/viajes?usuario=turista.demo@viajesazo.com"
```

Qué esperar: `totalElements: 2` (ids 1 y 2), ordenados por fecha de inicio. El `@` del email se
manda tal cual con `curl.exe`; si se usa `Invoke-RestMethod`, hay que codificarlo como `%40` o
PowerShell lo interpreta como userinfo de la URL y falla con "remote name could not be resolved".

- `?usuario=familia.demo@viajesazo.com` → `totalElements: 1` (id 5).
- `?usuario=no.existe@viajesazo.com` → `totalElements: 0` con **200** (página vacía, no 404).
- Sin `?usuario` → **400** `falta el parámetro obligatorio 'usuario'`.

### 8.18 `GET /api/viajes/{id}` — soporte (detalle para editar)

```powershell
curl.exe -s http://localhost:8080/api/viajes/1
```

Qué esperar: el viaje con `ubicacion` anidada (con `latitud`/`longitud`), `ritmo`,
`interesesCategoria`, `estado` y `usuario`. `GET /api/viajes/999` → 404
`No existe el viaje con id 999`.

### 8.19 `POST /api/viajes` — VZ-19

```json
{
  "nombre": "Prueba manual",
  "ubicacion": { "ciudad": "Bariloche", "localidad": "Río Negro", "latitud": -41.13, "longitud": -71.31 },
  "rangoInteresKm": 25.5,
  "fechaInicio": "2026-11-01",
  "fechaFin": "2026-11-10",
  "ritmo": "INTENSIVO",
  "interesesCategoria": ["NATURALEZA", "AVENTURA"],
  "usuario": "turista.demo@viajesazo.com"
}
```

Qué esperar: **201**, el viaje creado con su `id` y `estado: "PLANIFICADO"` (lo fuerza el service;
si el body trae otro `estado`, se ignora).

`ritmo` acepta exactamente `TRANQUILO`, `EQUILIBRADO`, `INTENSIVO` (ojo: es **`INTENSIVO`**, no
`INTENSO`). `interesesCategoria` acepta `NATURALEZA`, `GASTRONOMIA`, `CULTURA`, `HISTORIA`,
`AVENTURA`, `VIDA_NOCTURNA`, `MUSICA`, `COMPRAS`, `FAMILIAR_Y_RELAX`.

Casos de error, **medidos contra la app corriendo**:

| Body | Status | `message` |
| --- | --- | --- |
| `nombre: ""` | 400 | `nombre: El nombre del viaje no puede estar vacío` |
| `usuario: ""` | 400 | `usuario: El turista no puede estar vacío` |
| `rangoInteresKm: -5` | 400 | `rangoInteresKm: El rango de interés debe ser mayor a cero` |
| `fechaFin` anterior a `fechaInicio` | 400 | `la fecha de finalización no puede ser anterior a la de inicio` |
| `ritmo: "INTENSO"` (inválido) | 400 | `el cuerpo de la petición no es válido o tiene un formato incorrecto` |
| sin `ubicacion` | 400 | `ubicacion: La ubicación de interés no puede estar vacía` |
| `latitud: -100` | 400 | `ubicacion.latitud: La latitud debe ser mayor o igual a -90` |

### 8.20 `PUT /api/viajes/{id}` — VZ-21

Mismo body que el POST.

```powershell
curl.exe -s -X PUT http://localhost:8080/api/viajes/1 `
  -H "Content-Type: application/json" --data-binary "@target\viaje.json"
```

Qué esperar: **200** con el viaje modificado. No se puede cambiar el `estado` por acá (el mapeo de
update lo ignora). `PUT /api/viajes/999` → 404.

### 8.21 `DELETE /api/viajes/{id}` — VZ-23 (baja **lógica**)

```powershell
curl.exe -s -i -X DELETE http://localhost:8080/api/viajes/1
```

Qué esperar: **204** y **cuerpo vacío**. Pero a diferencia del `DELETE` de eventos (baja **física**),
acá el viaje **no se borra**: queda con `estado = CANCELADO` y deja de estar disponible. Para
comprobarlo:

- `GET /api/viajes/1` → **404** `No existe el viaje con id 1`.
- `GET /api/viajes?usuario=turista.demo@viajesazo.com` → `totalElements: 1` (ya no está el id 1).
- `DELETE /api/viajes/999` → 404.
- El viaje cancelado **reaparece al reiniciar la app**, porque el seed se reejecuta: la baja es
  lógica, no sobrevive entre arranques.

### 8.22 `GET /api/viajes/abc` (id no numérico) → 400

```powershell
curl.exe -s http://localhost:8080/api/viajes/abc
```

Qué esperar: **400** `el parámetro 'id' tiene un formato inválido` (lo maneja `handleTypeMismatch`).

## 9. Bordes conocidos — probar a mano

Estos no los verifiqué y no están cubiertos por los tests, así que conviene comprobarlos:

1. **Id no numérico**: `GET /api/eventos/abc`. Devuelve **400** con
   `el parámetro 'id' tiene un formato inválido`. Desde el Sprint 2, `GlobalExceptionHandler` maneja
   `MethodArgumentTypeMismatchException` para **todos** los controllers (antes caía en el catch-all y
   devolvía 500). El frontend igual lo evita: valida el id antes de pedir.
2. **`?page` negativo o `?size=0`**: ver si Spring los clampa o devuelve 400.

Verificados durante el smoke test y **ya cubiertos por los tests**, así que no quedan como bordes:
el email duplicado (400 con mensaje claro, por pre-chequeo y no por la constraint), `""` en
`LocalDate`/`LocalTime`, `"imagenes": [""]`, la regla `imagenes: []` vs `null` en el PUT, y el 204
del `DELETE` sin cuerpo.

**Trampa de PowerShell al probar con curl:** las comillas dobles de un `-d '{"a":"b"}'` inline
las mangla PowerShell 5.1 y el body llega sin comillas, así que Jackson responde
`el cuerpo de la petición no es válido...` y parece un bug de la API cuando el JSON estaba bien.
Por eso las secciones de arriba usan `--data-binary "@archivo.json"`. Si se prefiere inline, hay
que escapar: `-d '{\"nombre\":\"X\"}'`.

El **email duplicado ya no está en esta lista**: `PublicadorService.create` hace el pre-chequeo con
`existsByEmail` y devuelve 400 con un mensaje claro, y `GlobalExceptionHandler` maneja además
`DataIntegrityViolationException` por si dos altas simultáneas se escapan del pre-chequeo. Está
cubierto por `PublicadorControllerTest`, `PublicadorServiceTest` y `PublicadorRepositoryTest`.

Lo que sigue siendo un **bug de diseño conocido**, no un endpoint roto: el mensaje de duplicado
confirma que un email está registrado, así que permite enumerar publicadores. Sin autenticación no
tiene arreglo razonable; cuando se agregue `Usuario`, conviene responder un 409 genérico o
verificar propiedad del email.

Para comprobar el mensaje crudo de la violación de unicidad en el log del servidor (que es donde
está el detalle, no en la respuesta):

```powershell
.\mvnw.cmd spring-boot:run
curl.exe -s -X POST http://localhost:8080/api/publicadores `
  -H "Content-Type: application/json; charset=utf-8" `
  -d '{\"nombre\":\"Duplicado\",\"email\":\"info@cordoba.gob.ar\"}'
```

La respuesta tiene que ser 400 con `"ya existe un publicador con ese email"`, **sin** mencionar la
tabla ni el índice. En la consola del backend aparece el `WARN` de Hibernate con el detalle.

## 10. Cheat sheet

```powershell
# levantar
.\mvnw.cmd spring-boot:run

# ver PID y bajar la app
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID>

# listados
curl.exe -s "http://localhost:8080/api/agenda/semanal?page=0&size=20"
curl.exe -s "http://localhost:8080/api/eventos?page=0&size=3"
curl.exe -s "http://localhost:8080/api/publicadores?page=0&size=20"
curl.exe -s "http://localhost:8080/api/publicadores/1/eventos?page=0&size=2"
curl.exe -s http://localhost:8080/api/eventos/1
curl.exe -s "http://localhost:8080/api/viajes?usuario=turista.demo@viajesazo.com"
curl.exe -s http://localhost:8080/api/viajes/1

# errores
curl.exe -s http://localhost:8080/api/eventos/999
curl.exe -s http://localhost:8080/api/viajes/999

# alta de publicador (ver sección 5 para el encoding)
curl.exe -s -X POST http://localhost:8080/api/publicadores `
  -H "Content-Type: application/json; charset=utf-8" `
  -d '{\"nombre\":\"Prueba manual\",\"email\":\"prueba@cordoba.gob.ar\"}'

# email duplicado -> 400 con "ya existe un publicador con ese email"
curl.exe -s -X POST http://localhost:8080/api/publicadores `
  -H "Content-Type: application/json; charset=utf-8" `
  -d '{\"nombre\":\"Duplicado\",\"email\":\"info@cordoba.gob.ar\"}'

# alta, edicion y baja de un evento (secciones 8.6 a 8.8 para los bodies completos)
curl.exe -s -X POST http://localhost:8080/api/eventos -H "Content-Type: application/json" -d '...'
curl.exe -s -X PUT  http://localhost:8080/api/eventos/1 -H "Content-Type: application/json" -d '...'
curl.exe -s -i -X DELETE http://localhost:8080/api/eventos/7   # 204 sin cuerpo (baja FISICA)

# viajes: alta, edicion y baja (seccion 8 bis para los bodies completos)
curl.exe -s "http://localhost:8080/api/viajes?usuario=turista.demo@viajesazo.com"
curl.exe -s -X POST http://localhost:8080/api/viajes -H "Content-Type: application/json" -d '...'
curl.exe -s -X PUT  http://localhost:8080/api/viajes/1 -H "Content-Type: application/json" -d '...'
curl.exe -s -i -X DELETE http://localhost:8080/api/viajes/1   # 204 sin cuerpo (baja LOGICA -> CANCELADO)

# tests automatizados (112, incluye lo de arriba salvo los bordes de la seccion 9)
.\mvnw.cmd clean test
```

Vale aclarar una diferencia entre esto y los tests: `.\mvnw.cmd clean test` **saltea el seed**
(el `maven-surefire-plugin` pone `spring.sql.init.mode=never`), y la app corriendo **no**. Por eso al
levantar la app hay datos y en los tests no: no es que los datos se pierdan, es que los tests corren
contra un esquema limpio a propósito.
