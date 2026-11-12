# Documentación Técnica: Planificación de Viajes

Este documento detalla las decisiones de diseño y la implementación de la capa de transferencia de datos (DTOs) y mapeo para la entidad `Viaje`.

## 1. DTO de Entrada (`ViajeRequest` y `UbicacionRequest`)

El objetivo de estos DTOs es encapsular estrictamente los datos que el usuario ingresa en el formulario de planificación, aplicando validaciones antes de que lleguen a la capa de negocio.

### Características Principales:
*   **Inmutabilidad (Records):** Se utilizan `records` de Java para garantizar que los datos de entrada no puedan ser mutados en medio del proceso.
*   **Validaciones Nativas (`jakarta.validation`):** 
    *   Uso de `@NotBlank` y `@NotNull` para evitar campos obligatorios vacíos.
    *   Se implementó validación en cascada mediante `@Valid` sobre `UbicacionRequest` para asegurar que las coordenadas y la ciudad se validen correctamente al recibir el JSON.
*   **Validación Condicional Personalizada:** Se utilizó `@AssertTrue` en el método `isOrdenFechasValido()` para garantizar que la `fechaFin` no sea anterior a `fechaInicio`. La anotación `@JsonIgnore` evita que este método de validación sea interpretado por Jackson (Swagger/Postman) como un campo del JSON.
*   **Omisión de Datos Sensibles/de Sesión:** El Request no solicita información de estado (ej. `EstadoViaje`) ni IDs autogenerados. *(Nota: El identificador del usuario propietario deberá extraerse de la sesión/token de seguridad y no del cuerpo de la petición por motivos de seguridad).*

## 2. DTO de Salida (`ViajeResponse` y `UbicacionResponse`)

El objetivo de estos DTOs es estructurar la información que el backend devuelve al cliente (Frontend/Móvil), aplanando o anidando estructuras según la conveniencia de la UI.

### Características Principales:
*   **Simplificación de Datos:** Se omiten campos internos de la base de datos (como los IDs de tablas intermedias). 
*   **Tipado Fuerte:** Se exponen directamente los Enums (`TipoRitmo`, `InteresCategoria`) para que el cliente pueda tipar sus respuestas en TypeScript/JavaScript de forma segura.
*   **Estructura Anidada Controlada:** La ubicación se devuelve en un objeto encapsulado (`UbicacionResponse`) que contiene solo `nombre`, `latitud` y `longitud`, ocultando diferencias del modelo físico.

## 3. Capa de Mapeo (`ViajeMapper`)

Se utilizó **MapStruct** para automatizar la conversión bidireccional entre los DTOs y las Entidades de persistencia (Hibernate/JPA). El mapper está configurado bajo la política estricta `ReportingPolicy.ERROR` para asegurar que ningún campo quede sin mapear de forma accidental.

### Resoluciones de Discrepancias (Mapping Rules):
1.  **Diferencias de Nomenclatura:** 
    *   El DTO envía `ubicacion`, pero la entidad espera `zonaInteres`. Se unificó usando `@Mapping(target = "zonaInteres", source = "ubicacion")`.
    *   El Request anidado usa `ciudadDeInteres`, pero la entidad `Ubicacion` lo llama `ciudad`. Se resolvió en un método de mapeo anidado dentro de la misma interfaz.
2.  **Manejo de Campos Faltantes:** 
    *   Campos como `id`, `estado` y `zonaHospedaje` se ignoraron explícitamente (`ignore = true`) ya que no provienen del formulario de creación.
3.  **Prevención de Nulos en Colecciones:** 
    *   Para la lista de `interesesCategoria`, se aplicó `NullValuePropertyMappingStrategy.IGNORE`. Esto evita que si el JSON no envía intereses, MapStruct pise la inicialización nativa de la entidad (`new ArrayList<>()`) con un valor nulo, previniendo `NullPointerExceptions` posteriores.
4.  **Composición Automática:** 
    *   MapStruct detecta e invoca automáticamente los métodos internos `toUbicacionEntity` y `toUbicacionResponse` al procesar la entidad padre `Viaje`.