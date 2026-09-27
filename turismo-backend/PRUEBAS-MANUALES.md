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
base arranca siempre con los mismos datos: **3 publicadores, 7 eventos y 5 imágenes**.

**Los ids son siempre los mismos** (van por orden de inserción), lo cual hace predecibles los ejemplos:

| id | Publicador | email |
| --- | --- | --- |
| 1 | Turismo Córdoba | info@cordoba.gob.ar |
| 2 | Municipalidad de Cosquín | cosquin@cordoba.gob.ar |
| 3 | Asociación de Artesanos | artesanos@cordoba.gob.ar |

| id | Evento | Categoría | Publicador | Fechas |
| --- | --- | --- | --- | --- |
| 1 | Festival de Folklore | CULTURA | 1 | hoy−2 → hoy+1 |
| 2 | Exposición de artesanías | CULTURA | 3 | hoy → hoy+3 |
| 3 | Gastronomía de la estancia | GASTRONOMIA | 1 | hoy+1 → hoy+1 |
| 4 | Cabalgata por las Sierras | AVENTURA | 2 | hoy+2 → hoy+2 |
| 5 | Festival de la Buena Mesa | GASTRONOMIA | 1 | hoy+4 → hoy+6 |
| 6 | Tarde de campo y avistamiento de aves | FAMILIA | 2 | hoy+5 → hoy+5 |
| 7 | Caminata al Cerro San Bernardo | NATURALEZA | 1 | hoy+9 → hoy+9 |

Eventos por publicador: **1 → 4 eventos** (1, 3, 5, 7), **2 → 2** (4, 6), **3 → 1** (2).

Las fechas del seed son relativas a `CURRENT_DATE` a propósito, para que la agenda siempre tenga
contenido sin importar el día en que se levante la app. Los ids, en cambio, son fijos.

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

Los dos listados (`/api/agenda/semanal` y `/api/publicadores/{id}/eventos`) aceptan:

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

Qué esperar: solo entran los eventos que **se solapan** con la ventana hoy→domingo. Como las fechas
del seed son relativas, la cantidad depende del día de la semana en que se pruebe:

- Si hoy es **domingo**, la ventana es un solo día y entran los eventos 1 y 2 → `totalElements: 2`.
- Si hoy es **miércoles** de una semana normal, entran los eventos 1, 2, 3, 4 → `totalElements: 4`.
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

- Publicador 2 → 2 eventos. Publicador 3 → 1 evento.
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

`categoria` acepta exactamente: `GASTRONOMIA`, `FAMILIA`, `CULTURA`, `NATURALEZA`, `AVENTURA`
(en mayúsculas; es como se persiste). **Cualquier otro valor da 400, no 500.**

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

Qué esperar: los 7 eventos del seed con `totalElements: 7`, `totalPages: 1`. Orden por fecha de
inicio y, dentro del mismo día, por hora de inicio (el orden lo impone el servidor).

- `?size=3` → `totalPages: 3`. La primera página trae los eventos 1, 2 y 3.
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

## 9. Bordes conocidos — probar a mano

Estos no los verifiqué y no están cubiertos por los tests, así que conviene comprobarlos:

1. **Id no numérico**: `GET /api/eventos/abc`. Los controllers **no** tienen `@Validated`, así que
   el handler de `ConstraintViolationException` no entra en juego. Lo esperable es que caiga en el
   catch-all y devuelva **500** en lugar de un 400. Si se quiere 400, hay que agregar `@Validated` a
   los controllers o manejar `MethodArgumentTypeMismatchException`. El frontend lo evita: valida el
   id antes de pedir y muestra "Identificador inválido" sin pegarle a la API.
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

# errores
curl.exe -s http://localhost:8080/api/eventos/999

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
curl.exe -s -i -X DELETE http://localhost:8080/api/eventos/7   # 204 sin cuerpo

# tests automatizados (83, incluye lo de arriba salvo los bordes de la sección 9)
.\mvnw.cmd clean test
```

Vale aclarar una diferencia entre esto y los tests: `.\mvnw.cmd clean test` **saltea el seed**
(el `maven-surefire-plugin` pone `spring.sql.init.mode=never`), y la app corriendo **no**. Por eso al
levantar la app hay datos y en los tests no: no es que los datos se pierdan, es que los tests corren
contra un esquema limpio a propósito.
