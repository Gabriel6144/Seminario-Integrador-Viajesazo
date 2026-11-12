# Estados de viaje — Sprint 3

> **Estado:** implementado y verificado.
> **Última verificación:** 196 tests en verde con `.\mvnw.cmd clean test` (22/10/2026).
> **Alcance:** backend. El frontend no se modificó.
> **Documentos relacionados:** [`PRUEBAS-MANUALES-SPRINT-3.md`](./PRUEBAS-MANUALES-SPRINT-3.md),
> [`CAMBIOS-Y-DECISIONES-SPRINT-3.md`](./CAMBIOS-Y-DECISIONES-SPRINT-3.md) y
> [`../turismo-backend/AGENTS.md`](../turismo-backend/AGENTS.md).

## 1. Resumen ejecutivo

Se convirtió `EstadoViaje` en una máquina de estados explícita. Antes el estado era un enum
que el servicio podía asignar sin reglas; ahora:

- las transiciones válidas están declaradas en el enum;
- la entidad `Viaje` es la única que puede cambiarlas;
- `POST`, `PUT`, `DELETE` y los endpoints de borradores respetan esas reglas;
- un scheduler materializa las transiciones que dependen de la fecha;
- los errores de transición se traducen a `400` con el formato de error existente.

La suite completa quedó en **196 tests**. El Sprint 2 cerraba con 134; el Sprint 3 ya había
sumado tests de propuestas antes de este cambio, y este agregó cobertura del enum, de la entidad,
del servicio y del controller.

Lo que **no** incluye este cambio:

- endpoints nuevos para forzar un estado;
- cambios en el frontend;
- bloqueo optimista con `@Version`;
- migraciones de base de datos (sigue `create-drop`);
- historial o auditoría de cambios de estado;
- autenticación por usuario.

## 2. El problema que se resolvió

El modelo anterior permitía estados inconsistentes:

- `POST /api/viajes` creaba el viaje en `PLANIFICADO`, pero no había una regla que impidiera
  pasarlo a cualquier otro estado por código;
- `DELETE` era el único cambio de estado previsto;
- los borradores se borraban físicamente, así que no quedaba rastro de que habían existido;
- no existía ninguna transición automática: un viaje cuya fecha ya había comenzado seguía
  figurando como `PLANIFICADO` para siempre;
- no estaba definido qué se podía editar y en qué estado.

El objetivo fue concentrar el ciclo de vida en el dominio y dejar al servicio como orquestador.

## 3. Máquina de estados

### 3.1 Estados

| Estado | Significado | Terminal |
| --- | --- | --- |
| `BORRADOR` | Viaje incompleto guardado desde el planificador. No aparece en “Mis viajes”. | No |
| `PLANIFICADO` | Viaje completo y confirmado por el turista. Es el estado con el que nace un viaje creado por `POST /api/viajes`. | No |
| `EN_CURSO` | El viaje ya comenzó según su fecha de inicio. | No |
| `FINALIZADO` | El viaje terminó. | Sí |
| `CANCELADO` | Baja lógica. Deja de existir para la API. | Sí |

### 3.2 Transiciones

```text
BORRADOR ──completar──▶ PLANIFICADO ──fechaInicio──▶ EN_CURSO ──después de fechaFin──▶ FINALIZADO
   │                         │
   │                         └──DELETE──┐
   └──descartar─────────────────────────┴──▶ CANCELADO
```

| Origen | Destino | Disparador | Regla |
| --- | --- | --- | --- |
| `BORRADOR` | `PLANIFICADO` | `POST /api/viajes/borradores/{id}/completar` | Todos los obligatorios completos y `fechaInicio >= hoy`. |
| `BORRADOR` | `CANCELADO` | `DELETE /api/viajes/borradores/{id}` | Baja lógica del borrador. |
| `PLANIFICADO` | `EN_CURSO` | Scheduler | `hoy >= fechaInicio`. |
| `PLANIFICADO` | `CANCELADO` | `DELETE /api/viajes/{id}` | Baja lógica del viaje. |
| `EN_CURSO` | `FINALIZADO` | Scheduler | `hoy > fechaFin`, o sea el día siguiente al fin. |
| `CANCELADO` | — | — | Terminal. |
| `FINALIZADO` | — | — | Terminal. |

No existen:

- `PLANIFICADO → BORRADOR`;
- `CANCELADO → cualquier otro estado`;
- `FINALIZADO → cualquier otro estado`;
- `EN_CURSO → CANCELADO`.

## 4. Dónde vive la regla

### 4.1 `EstadoViaje`

El enum declara la tabla de transiciones una sola vez:

```java
private static final Map<EstadoViaje, Set<EstadoViaje>> PERMITIDAS = new EnumMap<>(EstadoViaje.class);

static {
    PERMITIDAS.put(BORRADOR, EnumSet.of(PLANIFICADO, CANCELADO));
    PERMITIDAS.put(PLANIFICADO, EnumSet.of(EN_CURSO, CANCELADO));
    PERMITIDAS.put(EN_CURSO, EnumSet.of(FINALIZADO));
    PERMITIDAS.put(CANCELADO, EnumSet.noneOf(EstadoViaje.class));
    PERMITIDAS.put(FINALIZADO, EnumSet.noneOf(EstadoViaje.class));
}
```

Expone dos consultas:

- `puedeTransicionarA(destino)`: valida un destino, incluido `null`;
- `esTerminal()`: indica si el estado no tiene salidas.

La tabla está testeada de forma exhaustiva en `EstadoViajeTest`: recorre todos los pares
origen/destino contra un mapa independiente, así que agregar o quitar una transición sin test
falla.

### 4.2 `Viaje`

La entidad concentra las operaciones del ciclo de vida:

| Método | Qué hace |
| --- | --- |
| `transicionarA(EstadoViaje)` | Privado. Valida contra el enum y lanza `BusinessRuleException` si no corresponde. |
| `planificar(Clock)` | Valida los obligatorios del borrador y lo pasa a `PLANIFICADO`. |
| `cancelar()` | Baja lógica; solo válida desde `BORRADOR` o `PLANIFICADO`. |
| `validarEditable()` | Rechaza edición de `EN_CURSO`, `FINALIZADO` y `CANCELADO`. |
| `actualizarEstadoPorFechas(LocalDate)` | Aplica las transiciones automáticas de un viaje. |

`transicionarA` es **privado** a propósito: ningún servicio puede asignar `viaje.setEstado(...)`
salteando la validación. Las únicas asignaciones directas que quedan son las de creación
(`create` → `PLANIFICADO`, `saveDraft` → `BORRADOR`), que son estados iniciales, no transiciones.

`validarEditable` también rechaza `CANCELADO` aunque hoy sea inalcanzable desde `PUT`: los
repositorios ya filtran ese estado y responden `404`. La comprobación es defensiva, para que la
invariante no dependa de qué consulta usó el llamador.

## 5. Transiciones manuales por HTTP

| Endpoint | Efecto sobre el estado | Respuesta |
| --- | --- | --- |
| `POST /api/viajes` | Crea en `PLANIFICADO`. No es una transición. | `201` |
| `POST /api/viajes/borradores` | Crea en `BORRADOR`. No es una transición. | `201` |
| `PUT /api/viajes/{id}` | No cambia el estado; valida que el viaje sea editable. | `200` o `400` |
| `DELETE /api/viajes/{id}` | `PLANIFICADO → CANCELADO`. | `204` o `400` |
| `POST /api/viajes/borradores/{id}/completar` | `BORRADOR → PLANIFICADO` y deja `pasoActual = 8`. | `200` o `400` |
| `PUT /api/viajes/borradores/{id}` | No cambia el estado; solo actualiza un borrador. | `200` o `404` |
| `DELETE /api/viajes/borradores/{id}` | `BORRADOR → CANCELADO`. | `204` o `404` |

Detalles que importan:

- `POST /api/viajes` ignora cualquier estado que mande el cliente; el DTO ni siquiera tiene ese
  campo.
- Un viaje `CANCELADO` no se puede consultar ni editar: `GET`, `PUT` y `DELETE` responden `404`
  porque las consultas excluyen `BORRADOR` y `CANCELADO`.
- Un borrador completado deja de existir como borrador: `GET /api/viajes/borradores/{id}` pasa a
  `404`, pero `GET /api/viajes/{id}` responde `200` porque ya es un viaje planificado.
- El `DELETE` de un borrador sigue respondiendo `204`, igual que antes. Lo que cambió es que ya no
  borra la fila: la marca `CANCELADO`.

## 6. Transiciones automáticas

### 6.1 Componentes

- `TurismoBackendApplication` tiene `@EnableScheduling`.
- `ViajeEstadoScheduler` es un `@Component` con `@Scheduled` y `@ConditionalOnProperty`.
- `ViajeService.aplicarTransicionesAutomaticas()` hace el trabajo real dentro de una transacción.

El scheduler no conoce fechas ni estados: solo llama al servicio. El servicio busca los viajes en
`PLANIFICADO` o `EN_CURSO` con `findByEstadoIn` y le pide a cada entidad que se actualice según
`LocalDate.now(clock)`.

### 6.2 Reglas

| Situación | Resultado |
| --- | --- |
| `PLANIFICADO` y `hoy >= fechaInicio` | `EN_CURSO` |
| `PLANIFICADO` y `hoy > fechaFin` | `EN_CURSO` y luego `FINALIZADO` en la misma corrida |
| `EN_CURSO` y `hoy <= fechaFin` | Sigue `EN_CURSO` |
| `EN_CURSO` y `hoy > fechaFin` | `FINALIZADO` |
| `BORRADOR`, `CANCELADO` o `FINALIZADO` | No se toca |

El caso “planificado vencido” existe para no dejar viajes viejos en un estado intermedio. Se
respeta la secuencia de la máquina: primero pasa por `EN_CURSO` y después a `FINALIZADO`.

### 6.3 Granularidad y zona horaria

- La comparación es por **día**, no por hora.
- La API expone `LocalDate`; la entidad guarda `LocalDateTime` a medianoche (lo hace el mapper).
- `LocalDate.now(clock)` usa `Clock.systemDefaultZone()`: manda la zona horaria del servidor.
- El viaje permanece `EN_CURSO` **todo** el día de `fechaFin` y recién pasa a `FINALIZADO` al día
  siguiente. Es deliberado: finalizar a las 00:00 del último día cortaría el viaje antes de que
  termine.

### 6.4 Configuración

En `application.properties`:

```properties
app.viajes.transiciones.enabled=true
app.viajes.transiciones.fixed-delay-ms=60000
app.viajes.transiciones.initial-delay-ms=0
```

| Propiedad | Default | Uso |
| --- | --- | --- |
| `enabled` | `true` | Apaga el scheduler sin tocar código. |
| `fixed-delay-ms` | `60000` | Espera entre el fin de una corrida y el inicio de la siguiente. |
| `initial-delay-ms` | `0` | Primera corrida apenas arranca la aplicación. |

En tests, Surefire pasa `app.viajes.transiciones.enabled=false` como propiedad de sistema. Así la
suite no depende del reloj real ni de que el scheduler se dispare en medio de un test. No se usa un
`application.properties` de test porque taparía el de `main` en el classpath.

En ejecución normal, el estado puede quedar desactualizado hasta **60 segundos**. No hay
recomputación perezosa en los `GET`: leer no debe escribir.

## 7. Decisiones y por qué

### 7.1 El enum es la única fuente de verdad

**Decisión:** declarar las transiciones en `EstadoViaje` y validarlas en la entidad.

**Por qué:** si la tabla vive en el servicio, cualquier otro servicio o un test puede saltearla.
Con el enum, una transición nueva se agrega en un solo lugar y el test exhaustivo obliga a
actualizar la expectativa. Además, el enum queda reutilizable si mañana otro agregado necesita la
misma semántica.

**Alternativa descartada:** `if/switch` repartidos en el servicio. Repetía la regla y permitía
inconsistencias entre endpoints.

### 7.2 No se agrega `CONFIRMADO`

**Decisión:** `PLANIFICADO` sigue siendo el único estado previo al inicio.

**Por qué:** el frontend ya tipa y muestra `PLANIFICADO`
(`turismo-frontend/src/types/api.ts:263`) y el viaje se crea en ese estado. Agregar `CONFIRMADO`
entre `PLANIFICADO` y `EN_CURSO` no aportaba una regla distinta: hubiera obligado a migrar datos,
cambiar el frontend y definir un endpoint nuevo para confirmar. Se prefirió no duplicar semántica.

**Alternativa descartada:** `BORRADOR → PLANIFICADO → CONFIRMADO → EN_CURSO`. Dos estados con la
misma consecuencia práctica.

### 7.3 No se permite volver de `PLANIFICADO` a `BORRADOR`

**Decisión:** una vez planificado, el viaje no se puede “despublicar” a borrador.

**Por qué:** un borrador es un estado previo a completar los datos; un viaje planificado ya los
tiene y es visible en “Mis viajes”. Volver atrás escondería un viaje que el usuario ya confirmó y
abriría la puerta a editar datos incompletos sin las validaciones de `planificar`. Si necesita
cambios, sigue siendo editable con `PUT` mientras esté `PLANIFICADO`.

### 7.4 Edición bloqueada en `EN_CURSO` y `FINALIZADO`

**Decisión:** `PUT /api/viajes/{id}` responde `400` si el viaje ya comenzó o terminó.

**Por qué:** un viaje en curso o finalizado es un registro histórico. Permitir cambiar fechas,
zona o intereses después de que el scheduler lo movió dejaría un estado incoherente con el
itinerario y con las transiciones ya aplicadas. `CANCELADO` ni siquiera llega a esta validación:
responde `404` porque está oculto para la API.

**Alternativa descartada:** permitir editar solo campos “no logísticos”. Agregaba complejidad y
reglas por campo sin un requerimiento que lo justificara.

### 7.5 La baja de borradores es lógica

**Decisión:** `DELETE /api/viajes/borradores/{id}` pasa el borrador a `CANCELADO` en vez de
borrarlo físicamente.

**Por qué:** unifica el ciclo de vida con el de los viajes, conserva el historial y evita
referencias colgantes cuando existan itinerarios u otras entidades asociadas. La API mantiene el
mismo contrato (`204`) y sigue ocultando el registro: el borrador deja de aparecer en
`GET /api/viajes/borradores` y `GET /api/viajes/borradores/{id}` responde `404`.

**Costo:** la fila queda en la base. Es aceptable para el alcance actual y consistente con la baja
lógica que ya usaba `DELETE /api/viajes/{id}`.

### 7.6 Validación en la entidad y errores agregados

**Decisión:** mover la validación de completitud de `ViajeService.validateCompleteness` a
`Viaje.planificar(Clock)`, juntando todos los errores en un solo mensaje.

**Por qué:** la validez de “un borrador se puede planificar” es una invariante del agregado, no
una regla del servicio. Además, el usuario recibe de una vez todos los campos faltantes
(`String.join("; ", errores)`) en lugar de corregir uno por request.

**Detalle:** `planificar` exige `fechaInicio >= hoy`. Un borrador guardado con una fecha que ya
pasó no se puede completar; hay que editar el borrador primero. Es coherente con no planificar
viajes que ya empezaron.

### 7.7 `Clock` inyectado

**Decisión:** `planificar` y `aplicarTransicionesAutomaticas` usan el `Clock` del proyecto
(`AppConfig.clock()`), no `LocalDate.now()` directo.

**Por qué:** el proyecto ya usa `Clock` para la agenda semanal y para los timestamps de error. En
tests se fija con `Clock.fixed(...)`, así que las reglas de “hoy”, “fecha pasada” y “día siguiente
al fin” no dependen del día en que corre la suite. Era la única forma de testear los bordes de
fecha sin flakiness.

### 7.8 Scheduler in-app, no transición perezosa

**Decisión:** un job periódico materializa el estado; los `GET` no lo recalculan.

**Por qué:** un `GET` es una lectura y no debería escribir. Recalcular en cada lectura obligaría a
transacciones de escritura dentro de métodos `readOnly`, generaría efectos laterales sorprendentes
y repetiría trabajo en cada listado. El job centraliza la lógica y es fácil de apagar en tests.

**Costo:** hasta 60 segundos de desfase. Se acepta porque el estado no es crítico al segundo y el
intervalo es configurable. Si en producción hiciera falta exactitud inmediata, la salida sería un
job externo o recalcular al leer con una política explícita.

### 7.9 El scheduler vive en la aplicación, no en la base

**Decisión:** `@Scheduled` con `@EnableScheduling`.

**Por qué:** el proyecto es un backend académico de una sola instancia, con H2 en memoria. Un job
de base o un servicio externo (Quartz, cron del sistema) agrega infraestructura que hoy no se
justifica. La propiedad `enabled` permite desactivarlo en tests y en escenarios manuales.

**Limitación:** con varias instancias, todas corren el mismo job. Las transiciones son idempotentes
(una vez en `EN_CURSO`, `actualizarEstadoPorFechas` no vuelve a transicionar), pero no hay lock
distribuido. Si el proyecto escala, hay que coordinarlo.

### 7.10 Sin `@Version` por ahora

**Decisión:** no se agregó bloqueo optimista.

**Por qué:** el cambio se centró en el ciclo de vida y el alcance no pedía control de concurrencia.
Agregar `@Version` hubiera obligado a cambiar el contrato de error (`409`), los DTO y los tests.

**Riesgo documentado:** dos `PUT` simultáneos, o un `PUT` contra una transición automática, pueden
pisarse (gana el último `save`). Si se necesita consistencia estricta, el paso siguiente es
`@Version` en `Viaje` y un handler de `OptimisticLockException`.

### 7.11 `findByEstadoIn` en lugar de cargar todo

**Decisión:** el job consulta solo `PLANIFICADO` y `EN_CURSO`.

**Por qué:** los borradores y los estados terminales nunca se tocan. Filtrar en la consulta evita
traer viajes cancelados o finalizados que crecen con el tiempo. El job es global (no por usuario)
porque la fecha no depende del turista.

### 7.12 El estado se persiste como `STRING`

**Decisión:** mantener `@Enumerated(EnumType.STRING)` con `@JdbcTypeCode(SqlTypes.VARCHAR)`.

**Por qué:** ya era la configuración del proyecto para `EstadoViaje`, `TipoRitmo` e
`InteresCategoria`. Guardar ordinales haría que reordenar el enum corrompiera los datos. El seed y
las consultas usan los nombres (`PLANIFICADO`, etc.).

## 8. Matriz de respuestas y errores

| Caso | Status | Mensaje |
| --- | --- | --- |
| Completar borrador con faltantes | `400` | `La ubicación de interés no puede estar vacía; El rango de interés debe ser mayor a cero; ...` |
| Completar borrador con `fechaInicio` pasada | `400` | `La fecha de inicio no puede ser anterior a hoy` |
| Completar un id que no es borrador | `404` | `No existe el borrador con id {id}` |
| Editar un viaje `EN_CURSO` | `400` | `el viaje está en curso y no se puede modificar` |
| Editar un viaje `FINALIZADO` | `400` | `el viaje está finalizado y no se puede modificar` |
| Cancelar un viaje `EN_CURSO` | `400` | `no se puede pasar de EN_CURSO a CANCELADO` |
| Cancelar un viaje `FINALIZADO` | `400` | `no se puede pasar de FINALIZADO a CANCELADO` |
| Consultar/editar/borrar un viaje `CANCELADO` | `404` | `No existe el viaje con id {id}` |
| Guardar borrador sin `usuario` | `400` | `usuario: El turista no puede estar vacío` |
| Listar viajes sin `?usuario=` | `400` | `falta el parámetro obligatorio 'usuario'` |
| Estado inexistente en un JSON | `400` | `el cuerpo de la petición no es válido o tiene un formato incorrecto` |

Todos los errores de negocio usan el `ErrorResponse` existente:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "el viaje está en curso y no se puede modificar",
  "timestamp": "2026-10-22T10:15:30"
}
```

## 9. Limitaciones conocidas y deuda

1. **`POST /api/viajes` no valida fechas pasadas.** `planificar` sí lo hace, pero el alta directa
   solo verifica que `fechaFin >= fechaInicio`. Es una inconsistencia previa a este cambio. Se
   documenta y se usa en las pruebas manuales para poder observar la transición a `FINALIZADO` sin
   tocar la base. Si se quiere cerrar, el lugar es `ViajeService.validateRange` o el DTO, pero hay
   que decidir si el alta admite viajes históricos.
2. **Desfase de hasta 60 segundos.** No hay recálculo al leer.
3. **Sin auditoría.** No se guarda cuándo ni por qué cambió cada estado (solo el estado actual).
4. **Sin bloqueo optimista.** Ver 7.10.
5. **Sin coordinación entre instancias.** Ver 7.9.
6. **Zona horaria del servidor.** No hay zona por usuario; un viaje en otra zona se evalúa con el
   reloj local del backend.
7. **Un error en un viaje revierte la corrida completa.** `aplicarTransicionesAutomaticas` es una
   sola transacción; si una entidad lanzara una excepción, se revierte el lote y el scheduler
   reintenta en el próximo ciclo. Hoy todas las transiciones candidatas son válidas, pero conviene
   tenerlo presente si se agregan reglas nuevas.
8. **No hay endpoint para forzar estados.** Para probar `EN_CURSO` o `FINALIZADO` manualmente hay
   que esperar al scheduler o modificar datos.

## 10. Tests relevantes

Los conteos son totales por archivo; `EstadoViajeTest` y `ViajeTest` son nuevos, y los otros dos
se ampliaron.

| Archivo | Tests | Qué cubre |
| --- | --- | --- |
| `model/EstadoViajeTest.java` | 3 | Matriz completa de transiciones, destino nulo, estados terminales. |
| `model/ViajeTest.java` | 11 | `planificar` válido/incompleto/fecha pasada, cancelación, edición bloqueada, transiciones automáticas, borrador intocable. |
| `service/ViajeServiceTest.java` | 11 | Incluye completar borrador, no cancelar/editar `EN_CURSO` y transiciones automáticas con `Clock.fixed`. |
| `controller/ViajeControllerTest.java` | 15 | Incluye `DELETE` de un viaje `EN_CURSO` → `400`. |

Comando de verificación (desde `turismo-backend`):

```powershell
.\mvnw.cmd clean test
```

Resultado esperado: `Tests run: 196, Failures: 0, Errors: 0, Skipped: 0`.

## 11. Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `model/EstadoViaje.java` | Tabla de transiciones con `EnumMap`, `puedeTransicionarA` y `esTerminal`. |
| `model/Viaje.java` | `transicionarA`, `planificar`, `cancelar`, `validarEditable`, `actualizarEstadoPorFechas`. |
| `service/ViajeService.java` | `Clock`, `planificar`, baja lógica de borradores, validación de edición y job de transiciones. |
| `service/ViajeEstadoScheduler.java` | **Nuevo.** `@Scheduled` condicional. |
| `repository/ViajeRepository.java` | `findByEstadoIn`. |
| `TurismoBackendApplication.java` | `@EnableScheduling`. |
| `resources/application.properties` | Propiedades del scheduler. |
| `pom.xml` | Surefire desactiva el scheduler en tests. |
| `controller/ViajeController.java` | Solo se corrigió el javadoc de `deleteDraft`: ya no es baja física. |
| `test/.../EstadoViajeTest.java` | **Nuevo.** |
| `test/.../ViajeTest.java` | **Nuevo.** |
| `test/.../ViajeServiceTest.java` | Tests nuevos y `Clock.fixed`. |
| `test/.../ViajeControllerTest.java` | Test de `DELETE` en curso. |

`data.sql` no cambió: los viajes del seed siguen en `PLANIFICADO` con fechas relativas hacia
adelante.

## 12. Pruebas manuales en Postman

### 12.1 Preparación

1. Levantar la aplicación:

   ```powershell
   cd "C:\Users\gabri\OneDrive\Desktop\sprint3\Seminario-Integrador-Viajesazo\turismo-backend"
   .\mvnw.cmd spring-boot:run
   ```

   Esperar `Started TurismoBackendApplication`.

2. En Postman, crear una colección y un entorno con estas variables:

   | Variable | Valor inicial | Uso |
   | --- | --- | --- |
   | `baseUrl` | `http://localhost:8080` | Base de todas las requests. |
   | `usuario` | `turista.demo@viajesazo.com` | Turista del seed. |
   | `viajeId` | vacío | Se completa solo al crear el viaje del caso B. |
   | `borradorId` | vacío | Se completa solo al crear el borrador del caso D. |
   | `idEnCurso` | vacío | Se completa solo en el caso J. |
   | `idFinalizado` | vacío | Se completa solo en el caso K. |
   | `hoy`, `manana`, `menos1`, `menos3`, `futuro7`, `futuro9` | vacío | Los calcula el script. |

3. En la colección, pestaña **Pre-request Script**, pegar:

   ```js
   const pad = n => String(n).padStart(2, '0');
   const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
   const day = offset => {
     const d = new Date();
     d.setDate(d.getDate() + offset);
     return fmt(d);
   };

   pm.collectionVariables.set('hoy', day(0));
   pm.collectionVariables.set('manana', day(1));
   pm.collectionVariables.set('menos1', day(-1));
   pm.collectionVariables.set('menos3', day(-3));
   pm.collectionVariables.set('futuro7', day(7));
   pm.collectionVariables.set('futuro9', day(9));
   ```

   El script usa la hora local, igual que el backend si corren en la misma máquina. Evitá
   `toISOString().slice(0, 10)` porque convierte a UTC y cerca de medianoche puede dar otro día.

4. Para todas las requests con body: `Content-Type: application/json` y body **raw JSON**.
5. Las requests de escritura llevan body; las de lectura no.

### 12.2 Casos

Resumen para tener a mano:

| Caso | Request | Esperado |
| --- | --- | --- |
| A | `GET /api/viajes?usuario=...` | `200`, 2 viajes del seed |
| B | `POST /api/viajes` | `201`, `PLANIFICADO` |
| C | `PUT /api/viajes/{id}` | `200`, datos editados |
| D | `POST /api/viajes/borradores` | `201`, `BORRADOR` |
| E | `GET /api/viajes/borradores?usuario=...` | `200`, incluye el borrador |
| F | `POST /api/viajes/borradores/{id}/completar` incompleto | `400` con los faltantes |
| G | `PUT` + `POST .../completar` con datos completos | `200`, `PLANIFICADO` |
| H | `DELETE /api/viajes/borradores/{id}` | `204`; luego `404` |
| I | `DELETE /api/viajes/{id}` | `204`; luego `404` |
| J | Viaje con `fechaInicio = hoy`; esperar al scheduler | `EN_CURSO`; `PUT`/`DELETE` → `400` |
| K | Viaje con fechas pasadas; esperar al scheduler | `FINALIZADO`; `PUT`/`DELETE` → `400` |
| L | Esperar otro ciclo | El estado no cambia |

#### Caso A — Listado del seed

`GET {{baseUrl}}/api/viajes?usuario={{usuario}}`

Esperado: `200`, `page.totalElements = 2`, ambos `PLANIFICADO`. Anotar los `id` devueltos; los del
seed son los que usa el caso I.

Test de Postman:

```js
pm.test('200 y dos viajes del seed', () => {
  pm.response.to.have.status(200);
  const body = pm.response.json();
  pm.expect(body.page.totalElements).to.eql(2);
});
```

La forma paginada es la del proyecto:

```json
{
  "content": [ { "id": 1, "estado": "PLANIFICADO", "...": "..." } ],
  "page": { "size": 20, "number": 0, "totalElements": 2, "totalPages": 1 }
}
```

#### Caso B — Crear un viaje planificado

`POST {{baseUrl}}/api/viajes`

```json
{
  "nombre": "Prueba manual de estados",
  "ubicacion": {
    "latitud": -31.42,
    "longitud": -64.18,
    "ciudad": "Ciudad de Córdoba",
    "localidad": "Córdoba"
  },
  "rangoInteresKm": 30,
  "fechaInicio": "{{futuro7}}",
  "fechaFin": "{{futuro9}}",
  "ritmo": "EQUILIBRADO",
  "interesesCategoria": ["CULTURA"],
  "usuario": "{{usuario}}"
}
```

Esperado: `201`, `estado = "PLANIFICADO"`. Guardar el id para los casos C e I:

```js
pm.test('crea un viaje planificado', () => {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.estado).to.eql('PLANIFICADO');
  pm.collectionVariables.set('viajeId', body.id);
});
```

#### Caso C — Editar el viaje planificado

`PUT {{baseUrl}}/api/viajes/{{viajeId}}`

Mismo body del caso B, cambiando `nombre` por `"Prueba manual de estados (editado)"`.

Esperado: `200` y el nombre nuevo. El estado sigue en `PLANIFICADO`.

#### Caso D — Crear un borrador parcial

`POST {{baseUrl}}/api/viajes/borradores`

```json
{
  "nombre": "Borrador manual",
  "pasoActual": 2,
  "usuario": "{{usuario}}"
}
```

Esperado: `201`, `estado = "BORRADOR"`, `pasoActual = 2`; los campos no enviados quedan `null`.
Guardar el id:

```js
const body = pm.response.json();
pm.collectionVariables.set('borradorId', body.id);
```

#### Caso E — Listar borradores

`GET {{baseUrl}}/api/viajes/borradores?usuario={{usuario}}`

Esperado: `200` y el borrador del caso D dentro de `content`. El listado no incluye viajes
planificados.

#### Caso F — Intentar completar un borrador incompleto

`POST {{baseUrl}}/api/viajes/borradores/{{borradorId}}/completar`

Esperado: `400` con **todos** los faltantes en un solo mensaje:

```text
La ubicación de interés no puede estar vacía; El rango de interés debe ser mayor a cero; El ritmo del viaje no puede estar vacío; Debe seleccionar al menos un interés; La fecha de inicio no puede estar vacía; La fecha de finalización no puede estar vacía
```

Test:

```js
pm.test('rechaza el borrador incompleto', () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().message).to.include('La fecha de inicio no puede estar vacía');
});
```

#### Caso G — Completar el borrador con datos válidos

1. `PUT {{baseUrl}}/api/viajes/borradores/{{borradorId}}`

```json
{
  "nombre": "Borrador manual completo",
  "ubicacion": {
    "latitud": -31.42,
    "longitud": -64.18,
    "ciudad": "Ciudad de Córdoba",
    "localidad": "Córdoba"
  },
  "rangoInteresKm": 40,
  "fechaInicio": "{{futuro7}}",
  "fechaFin": "{{futuro9}}",
  "ritmo": "TRANQUILO",
  "interesesCategoria": ["CULTURA", "GASTRONOMIA"],
  "pasoActual": 7,
  "usuario": "{{usuario}}"
}
```

Esperado: `200`, sigue `BORRADOR`.

2. `POST {{baseUrl}}/api/viajes/borradores/{{borradorId}}/completar`

Esperado: `200`, `estado = "PLANIFICADO"`, `pasoActual = 8`.

3. `GET {{baseUrl}}/api/viajes/{{borradorId}}`

Esperado: `200` (ya es un viaje planificado, no un borrador).

4. `GET {{baseUrl}}/api/viajes/borradores/{{borradorId}}`

Esperado: `404` (`No existe el borrador con id ...`).

#### Caso H — Descartar un borrador (baja lógica)

1. Crear otro borrador con el body del caso D y guardar su id en `borradorId` (reemplaza el del
   caso G):

   ```js
   pm.collectionVariables.set('borradorId', pm.response.json().id);
   ```

2. `DELETE {{baseUrl}}/api/viajes/borradores/{{borradorId}}`

Esperado: `204` sin cuerpo.

3. `GET {{baseUrl}}/api/viajes/borradores/{{borradorId}}`

Esperado: `404`.

4. `GET {{baseUrl}}/api/viajes/borradores?usuario={{usuario}}`

Esperado: `200` y el borrador descartado **no** aparece.

#### Caso I — Cancelar un viaje planificado

`DELETE {{baseUrl}}/api/viajes/{{viajeId}}` (el creado en el caso B)

Esperado: `204`.

Luego:

- `GET {{baseUrl}}/api/viajes/{{viajeId}}` → `404`.
- `GET {{baseUrl}}/api/viajes?usuario={{usuario}}` → ya no lo incluye.

#### Caso J — Transición automática a `EN_CURSO`

1. Crear un viaje que empiece hoy:

   `POST {{baseUrl}}/api/viajes`

   ```json
   {
     "nombre": "Viaje en curso automático",
     "ubicacion": {
       "latitud": -31.42,
       "longitud": -64.18,
       "ciudad": "Ciudad de Córdoba",
       "localidad": "Córdoba"
     },
     "rangoInteresKm": 20,
     "fechaInicio": "{{hoy}}",
     "fechaFin": "{{manana}}",
     "ritmo": "EQUILIBRADO",
     "interesesCategoria": ["CULTURA"],
     "usuario": "{{usuario}}"
   }
   ```

   Esperado: `201`, `estado = "PLANIFICADO"`. Si el ciclo del scheduler corre justo después del
   alta, la respuesta ya podría venir en `EN_CURSO`; el paso 3 es el que confirma el estado final.
   Guardar el id:

   ```js
   pm.collectionVariables.set('idEnCurso', pm.response.json().id);
   ```

2. Esperar hasta 60 segundos (o reiniciar con el scheduler más rápido; ver 12.4).
3. `GET {{baseUrl}}/api/viajes/{{idEnCurso}}`

   Esperado: `200`, `estado = "EN_CURSO"`.

4. `PUT {{baseUrl}}/api/viajes/{{idEnCurso}}` con cualquier body válido

   Esperado: `400`, mensaje `el viaje está en curso y no se puede modificar`.

5. `DELETE {{baseUrl}}/api/viajes/{{idEnCurso}}`

   Esperado: `400`, mensaje `no se puede pasar de EN_CURSO a CANCELADO`.

#### Caso K — Transición automática a `FINALIZADO`

1. Crear un viaje con fechas pasadas:

   ```json
   {
     "nombre": "Viaje finalizado automático",
     "ubicacion": {
       "latitud": -31.42,
       "longitud": -64.18,
       "ciudad": "Ciudad de Córdoba",
       "localidad": "Córdoba"
     },
     "rangoInteresKm": 20,
     "fechaInicio": "{{menos3}}",
     "fechaFin": "{{menos1}}",
     "ritmo": "INTENSIVO",
     "interesesCategoria": ["AVENTURA"],
     "usuario": "{{usuario}}"
   }
   ```

   Esperado: `201`, `estado = "PLANIFICADO"` en la respuesta inmediata. Guardar el id:

   ```js
   pm.collectionVariables.set('idFinalizado', pm.response.json().id);
   ```

2. Esperar hasta 60 segundos.
3. `GET {{baseUrl}}/api/viajes/{{idFinalizado}}`

   Esperado: `200`, `estado = "FINALIZADO"`.

4. `PUT {{baseUrl}}/api/viajes/{{idFinalizado}}` con un body válido

   Esperado: `400`, mensaje `el viaje está finalizado y no se puede modificar`.

5. `DELETE {{baseUrl}}/api/viajes/{{idFinalizado}}`

   Esperado: `400`, mensaje `no se puede pasar de FINALIZADO a CANCELADO`.

Nota: el alta acepta fechas pasadas aunque `planificar` no. Es la limitación 9.1 y es justamente
lo que permite observar `FINALIZADO` sin modificar la base.

#### Caso L — Idempotencia

Esperar otro ciclo del scheduler (otros 60 segundos) y repetir los `GET` de los casos J y K.

Esperado: los estados no cambian (`EN_CURSO` sigue `EN_CURSO`, `FINALIZADO` sigue `FINALIZADO`) y
no aparecen errores en el log.

### 12.3 Checklist

- [ ] `GET /api/viajes?usuario=...` devuelve los 2 viajes del seed.
- [ ] `POST /api/viajes` crea en `PLANIFICADO`.
- [ ] `PUT /api/viajes/{id}` edita un viaje planificado.
- [ ] `POST /api/viajes/borradores` crea en `BORRADOR`.
- [ ] `GET /api/viajes/borradores` lista el borrador.
- [ ] Completar un borrador incompleto devuelve `400` con todos los faltantes.
- [ ] Completar un borrador válido devuelve `200`, `PLANIFICADO` y `pasoActual = 8`.
- [ ] Descartar un borrador devuelve `204` y luego `404`.
- [ ] Cancelar un viaje planificado devuelve `204` y luego `404`.
- [ ] Un viaje que empieza hoy pasa a `EN_CURSO` y no se puede editar ni cancelar.
- [ ] Un viaje con fechas pasadas pasa a `FINALIZADO` y no se puede editar ni cancelar.
- [ ] Los estados no cambian en una segunda corrida del scheduler.

### 12.4 Acelerar el scheduler (opcional)

Para no esperar 60 segundos, reiniciar con:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--app.viajes.transiciones.fixed-delay-ms=5000"
```

El valor no se versiona: es solo para la prueba manual. En tests el scheduler está apagado.

### 12.5 Trampas frecuentes

- **Los IDs no son fijos.** El seed crea los viajes en orden, pero si se reinicia la app H2 vuelve
  a empezar. Usar los scripts que guardan el `id` en variables.
- **`create-drop` borra todo al reiniciar.** No cuentes con datos de una corrida anterior.
- **Fechas.** `POST` acepta fechas pasadas, `completar` no. Para el caso G usar `{{futuro7}}`.
- **Zona horaria.** El backend usa la zona del servidor. Si Postman corre en otra máquina, calcular
  `hoy` contra esa zona, no contra UTC.
- **El scheduler no corre en tests.** Si ves estados que no avanzan en la suite, es esperado.
- **No hay endpoint para poner un estado a mano.** Si necesitás un `EN_CURSO` inmediato, usá fechas
  de hoy y esperá el ciclo, o reducí `fixed-delay-ms`.

## 13. Referencias

- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/EstadoViaje.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/model/Viaje.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/ViajeService.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/service/ViajeEstadoScheduler.java`
- `turismo-backend/src/main/java/com/viajesazo/turismo_backend/repository/ViajeRepository.java`
- `turismo-backend/src/main/resources/application.properties`
- `turismo-backend/src/test/java/com/viajesazo/turismo_backend/model/EstadoViajeTest.java`
- `turismo-backend/src/test/java/com/viajesazo/turismo_backend/model/ViajeTest.java`
- `turismo-frontend/src/types/api.ts` (estados que consume el frontend)
