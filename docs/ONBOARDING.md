# Onboarding — Backend Viajesazo

Guía para incorporarse al backend del proyecto **sabiendo Java pero sin experiencia en Spring
Boot**. No cubre fundamentos del lenguaje: cubre el puente entre lo que ya sabés de Java y cómo
se resuelve acá con Spring. Para el *por qué* de cada decisión, la fuente de verdad sigue siendo
[`turismo-backend/AGENTS.md`](../turismo-backend/AGENTS.md).

Todas las rutas de este documento son relativas a la raíz del repositorio.

## 1. Setup (medio día)

1. **JDK 21** instalado. El `pom.xml` declara Java 17, pero el JDK local es 21
   ([`turismo-backend/AGENTS.md`](../turismo-backend/AGENTS.md)).
2. **IDE**: IntelliJ IDEA (Community alcanza) o VS Code + Extension Pack for Java. IntelliJ
   reconoce Spring mejor (navegación de beans, endpoints).
3. **Usar siempre el wrapper, nunca un `mvn` global**: `.\mvnw.cmd` en Windows/PowerShell,
   `./mvnw` en Unix. La primera vez descarga Maven 3.9.16.
4. **Meta verificable del día 1** — hacelo vos, no lo mires hacer:

   ```powershell
   cd turismo-backend
   .\mvnw.cmd clean test          # tienen que quedar 83 tests en verde
   .\mvnw.cmd spring-boot:run     # levanta en http://localhost:8080
   ```

   Y con la app corriendo, probar un par de curls de
   [`turismo-backend/PRUEBAS-MANUALES.md`](../turismo-backend/PRUEBAS-MANUALES.md).

> **Trampa**: usá siempre `clean test`, nunca `test` a secas. Un `application.properties`
> viejo en `target/test-classes/` opaca el de `main` y los tests corren con la config por
> defecto. Se pierde mucho tiempo con esto ([`AGENTS.md`](../turismo-backend/AGENTS.md)).

## 2. Orden de lectura

El `AGENTS.md` es denso y está escrito también para agentes de IA. No lo leas de corrido:

1. [`README.md`](../README.md) raíz — qué es el proyecto y cómo levantarlo.
2. [`turismo-backend/PRUEBAS-MANUALES.md`](../turismo-backend/PRUEBAS-MANUALES.md) — para ver la
   API funcionando antes de tocar código.
3. **Un solo slice vertical completo en el IDE**, con la sección 3 de este documento como guía.
4. [`turismo-backend/AGENTS.md`](../turismo-backend/AGENTS.md) — por secciones, a medida que
   aparezcan dudas; no de un tirón.

El repo tiene también un skill de terceros en `turismo-backend/.agents/skills/java-springboot`.
Ojo: donde ese skill y `AGENTS.md` difieran, **manda `AGENTS.md`**.

## 3. El slice vertical: seguí una request entera

Todo el backend sigue un mismo patrón por capas. Copiar `Evento` es la forma de entender y de
agregar features. Seguí el recorrido de un `POST /api/eventos`:

```
EventoRequest        (dto/request)   → lo que valida la entrada
  → EventoController  (controller)   → @RestController, ruteo y @Valid
  → EventoService     (service)      → reglas de negocio + @Transactional
  → EventoMapper      (mapper)       → entidad <-> DTO (MapStruct)
  → EventoRepository  (repository)   → acceso a datos (Spring Data JPA)
  → Evento            (model)        → la entidad JPA
  → EventoResponse    (dto/response) → lo que devuelve la API
  → GlobalExceptionHandler (exception) → traduce excepciones a códigos HTTP
```

Archivo por archivo: `turismo-backend/src/main/java/com/viajesazo/turismo_backend/`.

Dos detalles clave del flujo:

- **El service mapea entidad → DTO dentro de la transacción** (`EventoService.java`). Con
  `spring.jpa.open-in-view=false`, si el mapeo se hiciera afuera, cualquier acceso a una relación
  `LAZY` explotaría.
- **`@Transactional` es granular**, no a nivel de clase: escrituras con `@Transactional`, lecturas
  con `@Transactional(readOnly = true)`.

## 4. Puente Java → Spring

Lo que ya sabés de Java y cómo se hace acá:

| Ya sabés de Java | Cómo se hace acá | Dónde verlo |
| --- | --- | --- |
| Crear objetos con `new` | Inyección por constructor — Spring arma el grafo | `EventoService.java:26-32` |
| `synchronized`, manejar threads | `@Transactional` (una transacción por operación) | `EventoService.java:34-92` |
| Clases POJO con getters/setters | Entidades JPA (`@Entity`, `@Id`, relaciones) | `model/Evento.java`, `model/Publicador.java` |
| Serializar a JSON a mano | DTOs como `record` + MapStruct genera el mapeo | `mapper/EventoMapper.java`, `dto/` |
| `if`/`throw new IllegalArgument...` | `@Valid` en el DTO + `@RestControllerAdvice` | `exception/GlobalExceptionHandler.java` |
| Interfaces + implementación manual | Spring Data: la interfaz del repository ya está implementada | `repository/EventoRepository.java` |

## 5. Las 3 trampas de Spring Boot 4 (esto te va a ahorrar horas)

El proyecto usa **Spring Boot 4.1.1**, muy nuevo. Casi todos los tutoriales de internet son de
Boot 3 y **no compilan acá**:

1. **Starters renombrados**: es `spring-boot-starter-webmvc`, no `spring-boot-starter-web`.
   Jackson es 3 (`tools.jackson.core`), no 2.
2. **Tests cambiaron de package**: **`@MockBean` ya no existe**; usá `@MockitoBean`. Y
   `@WebMvcTest`/`@DataJpaTest` vienen de packages distintos a los de Boot 3. Ver tabla exacta en
   `AGENTS.md`.
3. **La doc y las respuestas de IA son de Boot 3**: cuando algo "debería funcionar" y no
   compila, sospechá del cambio de versión antes que de tu código. Consultá `AGENTS.md` primero.

## 6. Escalera de primeras tareas

De menor a mayor riesgo. **Un PR por tarea, revisado en conjunto antes de pasar a la siguiente.**

1. **Solo tests** — cubrir los bordes conocidos sin cubrir que lista
   [`PRUEBAS-MANUALES.md`](../turismo-backend/PRUEBAS-MANUALES.md). Cero riesgo de producción y
   enseña el dominio y las convenciones de test.
2. **Feature espejo** — agregar `PUT` y `DELETE` de `Publicador` (hoy solo hay alta,
   ver [`README.md`](../README.md)). Se copia el patrón de `Evento` casi literal.
3. **Entidad nueva** — `Actividad` es la más parecida a `Evento`; `Preferencia` se apoya en el
   enum `Categoria` existente.
4. Recién después: `Viaje` / `Itinerario` (mayor diseño) — y **no** empezar por mapas, OSRM ni
   seguridad, que tienen decisiones pendientes del equipo (`AGENTS.md`).

## 7. Troubleshooting

| Síntoma | Causa / solución |
| --- | --- |
| Los tests corren con config rara | Usaste `test` en vez de `clean test`. |
| `CosquA-n` en la salida de PowerShell | `Invoke-WebRequest` miente con los acentos; usá `curl.exe -o archivo.json` y leé el archivo como UTF-8. Un `?` en consola tampoco implica dato malo. |
| Los datos desaparecieron al reiniciar | H2 es en memoria con `ddl-auto=create-drop`. Es esperado. |
| Warnings de `byte-buddy` en el log | Esperado en Boot 4 + JDK 21, no es error. |
| Un campo nuevo del DTO no compila | Los mappers usan `unmappedTargetPolicy = ERROR`: hay que mapearlo a mano. Es a propósito. |

## 8. Reglas que más fácil se rompen

- **Nomenclatura mixta**: el dominio va en **español** (clases de entidad, campos, rutas, tablas,
  DTOs, mensajes) y el resto en **inglés** (nombres de métodos, campos internos, constantes de
  código). Tabla completa en `AGENTS.md`.
- **Indentación con tabulaciones**, no espacios.
- **Los `@DisplayName` van en español**; los identificadores de test en inglés.
- No hay linter ni formatter configurado: no inventes `spotless` ni `checkstyle`.

Para el flujo de trabajo (ramas, PRs, commits) ver [`CONTRIBUTING.md`](../CONTRIBUTING.md).
