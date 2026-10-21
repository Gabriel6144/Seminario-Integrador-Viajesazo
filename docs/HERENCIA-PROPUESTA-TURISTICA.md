# Cambios en el modelo de dominio: Herencia entre `PropuestaTuristica`, `Evento` y `Actividad`

> **Documento histórico.** Este texto fue el diseño inicial del Sprint 3 y quedó desactualizado.
> La fuente de verdad actual es [`CAMBIOS-Y-DECISIONES-SPRINT-3.md`](./CAMBIOS-Y-DECISIONES-SPRINT-3.md),
> que corrige, entre otras cosas, el nombre del discriminador (`subtipo`, no `tipo_propuesta`) y
> el modelado de `Disponibilidad` (`@Embeddable` + `@ElementCollection`, no entidad).


## Objetivo
Unificar la estructura de las propuestas turísticas pasando de `@MappedSuperclass` a una jerarquía con herencia JPA (`JOINED`), centralizando campos, relaciones y la gestión de imágenes, además de unificar la ubicación con la entidad `Ubicacion` ya existente.

## 1) ¿Por qué cambiar de `@MappedSuperclass` a herencia con `JOINED`?

Antes, `PropuestaTuristica` era una `@MappedSuperclass`. Esto significaba:
- **Sin tabla base**: Los campos de `PropuestaTuristica` se repetían en cada tabla hija (`evento`, `actividad`).
- **Sin polimorfismo real**: No podíamos consultar "todas las propuestas" de forma unificada.
- **Relaciones compartidas difíciles**: Campos como `ubicacion`, `modalidad`, etc. quedaban duplicados o inconsistentes.

Con `@Inheritance(strategy = InheritanceType.JOINED)` pasamos a:
- **Tabla base normalizada**: `propuesta_turistica` concentra los atributos y relaciones comunes.
- **Polimorfismo nativo**: Hibernate instancia el subtipo correcto (`Evento` o `Actividad`) según el discriminador.
- **Escalable**: Fácil agregar nuevos tipos de propuestas en el futuro.
- **Mejor integración**: Permite unificar con `Ubicacion` y compartir `imagenes`.

**Estrategia elegida:** `JOINED`. Descarta `SINGLE_TABLE` (demasiadas columnas nullable y mezcla de campos muy distintos) y `TABLE_PER_CLASS` (UNION costoso y menos práctico para FKs).

## 2) Decisiones tomadas y justificación

| Elemento | Decisión | Justificación |
| --- | --- | --- |
| **Estrategia** | `JOINED` con `@DiscriminatorColumn` | Normalizado, polimórfico y escalable. Requiere migración de esquema/datos, pero es el más correcto a futuro. |
| **`PropuestaTuristica`** | Pasa de `@MappedSuperclass` a `@Entity` abstracta | Ahora existe como tabla base (`propuesta_turistica`) y permite consultas polimórficas. |
| **Discriminador** | `tipo_propuesta` (STRING) con `@DiscriminatorValue("EVENTO")` / `@DiscriminatorValue("ACTIVIDAD")` | Hibernate lo usa para hidratar el subtipo correcto. Además mantenemos el enum `TipoPropuesta` como campo de negocio para lógica/filtrado. |
| **Ubicación** | Unificar con entidad `Ubicacion` (`ManyToOne` obligatorio) | Ya existe para `Viaje`. Evita duplicación de `localidad/direccion/latitud/longitud`. Se resuelve/crea vía `GeocodingService`. |
| **`lugarRecinto`** | Se mantiene en `PropuestaTuristica` | Se conserva la semántica (salón/recinto) sin afectar la precisión del geocoding. |
| **Imágenes** | Mover `@ElementCollection` a `PropuestaTuristica` | Tanto `Evento` como `Actividad` podrán tener imágenes. Ahora van a `propuesta_imagen` con FK `propuesta_id`. |
| **Modalidad** | Única (`@Enumerated`) | Requerimiento: una única modalidad por propuesta. Si fuera múltiple se usaría `@ElementCollection`. |
| **`TipoPropuesta`** | Se mantiene como enum + campo persistido | Complementa al discriminador de JPA. Útil para negocio/consultas sin usar `instanceof`. |
| **`horario` genérico** | Eliminado de la base | Confuso. `Evento` sigue con `horarioInicio/horarioFin`, `Actividad` gestiona franjas con `Disponibilidad`. |
| **Fechas de `Evento`** | Se mantienen `fechaInicio/fechaFin` + `horarioInicio/horarioFin` | Más claro para eventos de día completo. Compatible con la lógica de agenda semanal (solapamiento por fechas). No se pasó a `LocalDateTime`. |
| **`duracionMinutos` en `Actividad`** | Se mantiene | Útil para itinerarios/estimación de tiempo, independiente de las franjas en `Disponibilidad`. |
| **`Publicador`** | Obligatorio para todas las propuestas | Se mantiene trazabilidad y consistencia con el modelo actual. |

## 3) Cambios en el esquema (JOINED)

| Tabla | Contenido |
| --- | --- |
| `propuesta_turistica` (base) | `id`, `nombre`, `descripcion`, `tipo_propuesta` (discriminador), `categoria`, `modalidad`, `tipo_acceso`, `estado_propuesta_id`, `lugar_recinto`, `ubicacion_id`, `publicador_id` |
| `evento` (hija) | `id` (FK a `propuesta_turistica`), `fecha_inicio`, `fecha_fin`, `horario_inicio`, `horario_fin`, `monto_estimado`, `descripcion_arancel`, `sitio_oficial` |
| `actividad` (hija) | `id` (FK a `propuesta_turistica`), `duracion_minutos` |
| `propuesta_imagen` | Imágenes compartidas (`propuesta_id`, `url`) |
| `disponibilidad` | Sin cambios estructurales, sigue ligada a `Actividad` |
| `ubicacion` | Agregado campo `direccion` (se usa para geocodificación/mapeo) |

**Al persistir:** Hibernate inserta en `propuesta_turistica` primero (con discriminador), luego en la tabla hija con el mismo `id`.  
**Al leer:** Hibernate hace JOIN con la tabla hija según el discriminador e instancia la clase concreta.

## 4) Cómo aplicar el polimorfismo

El polimorfismo se aplica **a nivel JPA/Hibernate**, no con `if` manual en toda la app.

### Configuración
- `PropuestaTuristica`: `@Entity`, `@Inheritance(JOINED)`, `@DiscriminatorColumn(name="tipo_propuesta")`
- `Evento`: `@Entity`, `@Table(name="evento")`, `@DiscriminatorValue("EVENTO")`
- `Actividad`: `@Entity`, `@Table(name="actividad")`, `@DiscriminatorValue("ACTIVIDAD")`

### Uso práctico
Para aprovecharlo hoy podés crear un repositorio sobre la base:

```java
public interface PropuestaTuristicaRepository extends JpaRepository<PropuestaTuristica, Long> {}
```

```java
List<PropuestaTuristica> propuestas = propuestaTuristicaRepository.findAll();
for (PropuestaTuristica p : propuestas) {
    if (p instanceof Evento e) { /* lógica específica de evento */ }
    else if (p instanceof Actividad a) { /* lógica específica de actividad */ }
}
```

Hibernate se encarga de resolver el subtipo via discriminador + JOIN. **Nota:** `tipo_propuesta` (enum) es campo de negocio; el discriminador es el mecanismo de JPA para el polimorfismo.

## 5) Cambios en código

### Entidades
- `PropuestaTuristica`: migrada a entidad base con JOINED, agrega `tipoPropuesta`, `modalidad`, `ubicacion`, `lugarRecinto`, imágenes; elimina campos planos de ubicación y `horario`.
- `Evento`: pasa a `@DiscriminatorValue("EVENTO")`, hereda imagen/ubicación/lugarRecinto, mantiene fechas/horarios/aranceles.
- `Actividad`: pasa a `@DiscriminatorValue("ACTIVIDAD")`, mantiene `duracionMinutos` e `OneToMany` a `Disponibilidad`.
- `Disponibilidad`: agregado `@Table(name="disponibilidad")` (sin cambios funcionales).
- `Ubicacion`: agregado `direccion`.

### DTOs/Mapper/Servicio
- `EventoRequest/Response`: agregados `tipoPropuesta`, `modalidad`. Response ahora mapea ubicación desde `ubicacion.*`.
- `EventoMapper`: ignora `ubicacion` en toEntity/update, mapea `localidad/direccion/latitud/longitud` desde `ubicacion`.
- `EventoService`: ahora crea/guarda `Ubicacion` vía `UbicacionRepository`, asigna al evento. Lógica de validación/geocodificación adaptada.
- `UbicacionRepository`: creado.

### Datos
- `data.sql`: reescrito para esquema JOINED. Primero se insertan `publicador`, `estado_propuesta`, `ubicacion`. Luego `propuesta_turistica` (base), después `evento` (hija), y finalmente `propuesta_imagen`. Se actualizan viajes para usar las nuevas ubicaciones.

## 6) Impacto y notas para el equipo
- **API de eventos**: Se mantiene el contrato (`fechaInicio/Fin`, `horarioInicio/Fin`, `localidad/direccion/latitud/longitud` expuestos). El origen pasa de campos planos a `Ubicacion`.
- **Imágenes**: Ahora se persisten en `propuesta_imagen`. Si hay código que accede directamente a `evento_imagen`, actualizarlo (aunque con `create-drop` en dev no es problema).
- **Tests**: Muchos tests usan constructores/builders antiguos (campos movidos a `Ubicacion`, nuevo orden en `EventoRequest/Response`). Requieren actualización. La compilación de `main` está OK.
- **Geocodificación**: Sigue con Nominatim. Al crear `Evento` se resuelve la dirección y se persiste `Ubicacion` (se guarda nueva instancia por alta).
- **Compatibilidad**: Los endpoints existentes (`/api/eventos`, `/api/agenda/semanal`) siguen funcionando con el mapeo actualizado.

## 7) Estado actual
- Entidades, repositorios, mappers, servicio, DTOs y `data.sql` actualizados.
- Compilación de código principal: **exitosa**.
- Tests: con errores por constructores/métodos obsoletos (pendiente de ajuste masivo).
- Polimorfismo habilitado a nivel JPA (disponible via `PropuestaTuristicaRepository` si se necesita).
