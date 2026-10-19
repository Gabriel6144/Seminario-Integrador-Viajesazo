# Avance de Joaco — Gestión de viajes

Fecha de actualización: 11 de octubre de 2026

## Nota Importante para los pibes
Chicos este doc lo genero COPILOT para poder dejar registrado como procedió con los tests, porque al desarrollarlos me notificó que se requería el desarrollo del service de Viaje que no tenía que hacer pero se requeria. Asi que revisen si el service esta bien, además de las demas cosas. 

Otra cuestíon importante es que se pedia para el dev1: " - `model/Preferencia.java` (solo si se elige D2 con nivel de interés) " Esto no lo desarrollé porque no termino de entender que deberia contener y para que entidad deberia estar relacionado, porque no esta modelado en el diagrama de clases a la entidad "Preferencia". 

Por ultimo tendriamos que evaluar bien el tema de las coordenadas que se registren como atributos de las clases, ademas de como lo vamos a gestionar porque no me queda claro. Lo menciono porque al definir los atributos del Viaje me surgió duda porque esta modelado la clase ubicacion y en ningun momento lo asocié ni cree. 

## Objetivo del avance

Se incorporó una primera base funcional para registrar y consultar viajes turísticos en el
backend `turismo-backend`, respetando la organización existente del proyecto y tomando como
referencia el formato y la complejidad de los tests ya creados para eventos y publicadores.

El alcance realizado se concentró en:

- Agregar datos iniciales de viajes orientados al turista.
- Alinear el repositorio de viajes con los campos reales de la entidad `Viaje`.
- Incorporar una capa de servicio para centralizar las reglas básicas de viajes.
- Crear pruebas unitarias de servicio.
- Crear pruebas de persistencia del repositorio.
- Verificar los tests nuevos con Maven.

## Seed de viajes turísticos

Al final de `turismo-backend/src/main/resources/data.sql` se agregaron cinco viajes de ejemplo:

1. Escapada serrana por Villa General Belgrano.
2. Cultura y naturaleza en Córdoba.
3. Aventura en el Valle de Punilla.
4. Sabores y tradiciones de Córdoba.
5. Recorrido familiar por las sierras.

Características del seed:

- Está pensado para perfiles turísticos diferentes: demo general, aventura, gastronomía y
  familia.
- Usa los ritmos disponibles en `TipoRitmo`: `TRANQUILO`, `EQUILIBRADO` e `INTENSIVO`.
- Usa fechas relativas a `CURRENT_DATE`, por lo que los datos mantienen vigencia al ejecutar la
  aplicación en otro momento.
- Usa `LocalDateTime` mediante expresiones de fecha compatibles con la inicialización de H2.
- Mantiene sin cambios las líneas existentes del archivo y agrega los inserts únicamente al final.
- El campo `estado` queda sin valor porque la relación es opcional en el modelo actual.

## Modelo y persistencia

La entidad `Viaje` contempla actualmente:

- `id`
- `nombre`
- `zonaInteres`
- `rangoInteresKm`
- `fechaInicio`
- `fechaFin`
- `ritmo`
- `estado`
- `usuario`

### Ajustes realizados para que el modelo sea persistible

El repositorio original de viajes tenía referencias a `horarioInicio` y trabajaba con
`LocalDate`, aunque la entidad `Viaje` define fechas como `LocalDateTime` y no posee un campo
`horarioInicio`. Para mantener consistencia con el modelo real:

- `findAllByOrderByFechaInicioAscHorarioInicioAsc` se reemplazó por
  `findAllByOrderByFechaInicioAscFechaFinAsc`.
- `findOverlapping` ahora recibe `LocalDateTime`.
- La consulta de solapamiento ordena por fecha de inicio y fecha de finalización.

También se corrigió el mapeo de `Viaje.estado`. Como `Estado` es una entidad con tabla e
identificador propio, se configuró como relación opcional `@ManyToOne` con la columna
`estado_id`, en lugar de tratarlo como una columna simple.

## Capa de servicio agregada

Se incorporó `ViajeService` siguiendo el patrón de `EventoService`:

- `create`: valida el rango de fechas y guarda el viaje.
- `update`: obtiene el viaje existente, actualiza sus campos y lo guarda.
- `delete`: elimina el viaje existente.
- `findById`: devuelve el viaje o informa un `ResourceNotFoundException`.
- `findAll`: delega el listado ordenado y paginado al repositorio.
- `findOverlapping`: valida el rango solicitado y consulta los viajes que se solapan.

Las operaciones de escritura usan `@Transactional` y las consultas usan
`@Transactional(readOnly = true)`, manteniendo el criterio aplicado en los servicios existentes.

La validación implementada evita:

- Fechas de inicio o finalización nulas.
- Fechas de finalización anteriores a la fecha de inicio.
- Rangos de consulta invertidos.

## Pruebas agregadas

### `ViajeRepositoryTest`

Ubicación:

`turismo-backend/src/test/java/com/viajesazo/turismo_backend/repository/ViajeRepositoryTest.java`

Se verifican tres comportamientos:

- Incluye viajes que se solapan total o parcialmente con el rango consultado.
- Excluye viajes completamente anteriores o posteriores al rango.
- Ordena el listado por inicio y finalización.

El test utiliza `@DataJpaTest`, al igual que las pruebas de repositorio existentes.

### `ViajeServiceTest`

Ubicación:

`turismo-backend/src/test/java/com/viajesazo/turismo_backend/service/ViajeServiceTest.java`

Se verifican seis comportamientos:

- Registro de un viaje y devolución del identificador asignado.
- Rechazo de rangos de fechas inválidos sin guardar.
- Actualización de un viaje existente.
- Error al consultar un viaje inexistente.
- Listado paginado de viajes.
- Consulta de viajes que se solapan con un rango.

El test utiliza Mockito y `@ExtendWith(MockitoExtension.class)`, siguiendo el patrón de
`EventoServiceTest` y `PublicadorServiceTest`.

## Validación ejecutada

Se ejecutó el siguiente comando desde la raíz del repositorio:

```text
mvn -f turismo-backend\pom.xml -Dtest=ViajeRepositoryTest,ViajeServiceTest test -q
```

Resultado:

```text
ViajeRepositoryTest: 3 tests, 0 failures, 0 errors
ViajeServiceTest:    6 tests, 0 failures, 0 errors
```

También se verificó el diff con `git diff --check`, sin errores de espacios en blanco.

## Consideraciones y pendientes

Este avance cubre la persistencia y la lógica de servicio básica. Todavía quedan pendientes
para completar el alcance funcional previsto en la planificación de Sprint 2:

- Crear DTOs de request/response específicos para viajes.
- Crear mapper de viajes, si el contrato final continúa utilizando DTOs.
- Crear controller REST para exponer el CRUD.
- Incorporar validaciones Bean Validation en el contrato HTTP.
- Definir formalmente la asociación con una entidad de turista o usuario.
- Resolver si la baja debe ser física o lógica. La implementación actual del servicio realiza
  baja física, mientras que la planificación de Sprint 2 propone baja lógica mediante un campo
  `activo`.
- Incorporar filtro de viajes por turista cuando exista el identificador o entidad
  correspondiente.
- Agregar pruebas de controller y, si corresponde al contrato final, pruebas de mapper.

Estas decisiones deben confirmarse antes de construir la capa REST definitiva para evitar que el
contrato del backend se aparte de las historias de usuario VZ-19, VZ-21, VZ-22 y VZ-23.


# Implementación tests con EstadoPropuesta como clase de dominio persistente

## Informe final

Se adaptó el backend para que `EstadoPropuesta` funcione como una clase de dominio persistente y no como un `enum`.

### Cambios realizados

- `EstadoPropuesta.java`
  - Convertida en entidad JPA.
  - Tabla asociada: `estado_propuesta`.
  - Campos:
    - `id`
    - `nombre`
    - `descripcion`
  - `nombre` configurado como único.

- `PropuestaTuristica.java`
  - Se reemplazó `@Enumerated` por una relación:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "estado_propuesta_id", nullable = false)
protected EstadoPropuesta estadoPropuesta;
```

- `EstadoPropuestaRepository.java`
  - Se agregó repositorio para buscar estados por nombre.

- `EventoService.java`
  - El alta de eventos ahora busca el estado `INICIADO` desde la base de datos.
  - Si el estado no existe, se informa explícitamente mediante `IllegalStateException`.
  - Ya no se utiliza `EstadoPropuesta.INICIADO`.

- `data.sql`
  - Se agregaron los estados:
    - `INICIADO`
    - `REPROGRAMADO`
    - `CANCELADO`
    - `FINALIZADO`
  - Los eventos ahora utilizan `estado_propuesta_id`.
  - Se agregó la carga de estados antes de insertar los eventos.

- Tests adaptados:
  - `EventoServiceTest.java`
  - `EventoRepositoryTest.java`
  - `AgendaSemanalTest.java`
  - `EventoControllerTest.java`

- Documentación actualizada:
  - `SPRINT-1.md`
  - Se reemplazaron las referencias a `EstadoPropuesta` como enum por su representación como entidad catálogo y clave foránea.

## Limpieza de artefactos

Se eliminó específicamente:

```text
turismo-backend\target
```

Luego se regeneraron los artefactos ejecutando nuevamente Maven. El `target` actual contiene clases y reportes generados correctamente.

También se detuvo el proceso Java específico que estaba relacionado con el bloqueo anterior del directorio. No se eliminaron otros directorios ni se ejecutaron comandos destructivos sobre el repositorio.

## Validaciones

### Suite completa

```text
Tests run: 134
Failures: 0
Errors: 0
Skipped: 0
```

Comando utilizado:

```text
mvnw.cmd -q test
```

### Validaciones adicionales

- Compilación de producción exitosa.
- Compilación de tests exitosa.
- Tests específicos de eventos, repositorios, agenda y controladores exitosos.
- `git diff --check` sin errores.
- No quedan referencias a:
  - `EstadoPropuesta.INICIADO`
  - `enum EstadoPropuesta`
  - La antigua columna `estado_propuesta` como texto.

## Errores encontrados y resueltos

| Error | Estado |
|---|---|
| `EstadoPropuesta` utilizado como enum aunque el modelo requería una clase | Resuelto |
| `@Enumerated` incompatible con la nueva clase de dominio | Resuelto |
| Falta de una tabla y repositorio para los estados | Resuelto |
| Eventos de prueba sin estado persistente | Resuelto |
| Seed SQL incompatible con la nueva clave foránea | Resuelto |
| Artefactos inválidos/bloqueados en `target` | Limpiados y regenerados |
| Fallos finales en la suite de tests | Ninguno |

El modelo actual queda consistente entre dominio, entidades JPA, base de datos, servicios, seed inicial y pruebas automatizadas.



# Causa y corrección del error de ejecución en Backend
Causa raíz confirmada
El error no era realmente que Actividad no existiera.

El archivo .class sí estaba presente, pero estaba generado incorrectamente. Al inspeccionarlo se encontró que sus constructores contenían:


En consecuencia, Hibernate informaba:


aunque el archivo Actividad.class existiera físicamente.

Origen
El proyecto está configurado para Java 17:


pero Maven se estaba ejecutando con:


Además, la jerarquía utilizaba Lombok @SuperBuilder en:

PropuestaTuristica.java
Evento.java
Actividad.java
La combinación de JDK 25, compilación con release 17 y @SuperBuilder generaba bytecode inválido con stubs de error.

Corrección aplicada
Se eliminó @SuperBuilder de la jerarquía.

En Evento.java se agregó un builder explícito que conserva el uso actual:


y soporta también los atributos heredados:

id
nombre
descripcion
categoria
tipoAcceso
estadoPropuesta
localidad
direccion
latitud
longitud
publicador
Además, se eliminaron las anotaciones @Builder.Default que ya no correspondían al nuevo esquema de builders.

Validaciones realizadas
Compilación limpia
Se ejecutó con JDK 21:


Resultado:


Validación del bytecode
Se verificó el bytecode de Actividad.class.

Resultado:


Ya no aparecen:


Tests
Se ejecutó:


Resultado del proceso:


Importante para ejecutar localmente
El backend debe ejecutarse con un JDK compatible con la configuración del proyecto. En el equipo hay un JDK 21 instalado:


Antes de iniciar el backend desde PowerShell, utilizar:


Para verificar:


Debe mostrar:


Estado del error 502
El 502 Bad Gateway del frontend era una consecuencia del cierre del backend:


Al corregir los artefactos inválidos y eliminar @SuperBuilder, Hibernate ya puede cargar Actividad.

Si VS Code continúa intentando iniciar con JDK 25, puede volver a aparecer el problema aunque el código fuente esté corregido. En ese caso, hay que configurar VS Code para utilizar el JDK 21 mediante java.jdt.ls.java.home o ejecutar Maven desde una terminal con JAVA_HOME apuntando a JDK 21.